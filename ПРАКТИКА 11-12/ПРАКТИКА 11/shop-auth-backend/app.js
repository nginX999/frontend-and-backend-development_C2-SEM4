const express = require('express');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3003;

// JWT константы
const ACCESS_SECRET = "access-secret-key";
const REFRESH_SECRET = "refresh-secret-key";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

// Роли пользователей
const ROLES = {
  USER: 'user',
  SELLER: 'seller',
  ADMIN: 'admin'
};

// Хранилище для refresh-токенов
let refreshTokens = new Set();

// Middleware
app.use(express.json());
app.use(cors());

// Пути к файлам с данными
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');

// Создание директории data, если её нет
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Функции для работы с файлами
const readData = (filePath, defaultData = []) => {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Ошибка чтения файла ${filePath}:`, error);
    return defaultData;
  }
};

const writeData = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Ошибка записи в файл ${filePath}:`, error);
  }
};

// Инициализация данных
let users = readData(USERS_FILE, []);
let products = readData(PRODUCTS_FILE, []);

// Создание администратора по умолчанию, если его нет
const adminExists = users.find(u => u.role === ROLES.ADMIN);
if (!adminExists && users.length === 0) {
  const createAdmin = async () => {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = {
      id: nanoid(8),
      email: 'admin@shop.com',
      first_name: 'Admin',
      last_name: 'System',
      role: ROLES.ADMIN,
      isActive: true,
      hashedPassword
    };
    users.push(adminUser);
    writeData(USERS_FILE, users);
    console.log('✅ Администратор создан: admin@shop.com / admin123');
  };
  createAdmin();
}

// Функции хеширования
async function hashPassword(password) {
  const rounds = 10;
  return bcrypt.hash(password, rounds);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

// Функции генерации токенов
function generateAccessToken(user) {
  return jwt.sign(
    { 
      sub: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      type: 'access'
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { 
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh'
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

// ============ MIDDLEWARES ============

// Auth middleware - проверяет access-токен
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    if (payload.type !== 'access') {
      return res.status(401).json({ error: "Invalid token type" });
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Role middleware - проверяет наличие нужной роли
function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: "Access denied. Required role: " + allowedRoles.join(' or ') 
      });
    }
    
    next();
  };
}

// Вспомогательные функции
function findUserByEmail(email) {
  return users.find(u => u.email === email);
}

function findUserById(id) {
  return users.find(u => u.id === id);
}

function findProductOr404(id, res) {
  const product = products.find(p => p.id === id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return null;
  }
  return product;
}

// ============ МАРШРУТЫ АУТЕНТИФИКАЦИИ ============

// Регистрация (доступ: Гость)
app.post("/api/auth/register", async (req, res) => {
  const { email, first_name, last_name, password } = req.body;

  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({ error: "Все поля обязательны" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Некорректный email" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Пароль минимум 6 символов" });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: "Email уже существует" });
  }

  const hashedPassword = await hashPassword(password);
  
  const newUser = {
    id: nanoid(8),
    email,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    role: ROLES.USER, // По умолчанию - обычный пользователь
    isActive: true,
    hashedPassword
  };

  users.push(newUser);
  writeData(USERS_FILE, users);

  const { hashedPassword: _, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
});

// Вход (доступ: Гость)
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email и пароль обязательны" });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  // Проверка, не заблокирован ли пользователь
  if (user.isActive === false) {
    return res.status(403).json({ error: "Аккаунт заблокирован" });
  }

  const isValidPassword = await verifyPassword(password, user.hashedPassword);
  
  if (isValidPassword) {
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    refreshTokens.add(refreshToken);
    
    const { hashedPassword: _, ...userWithoutPassword } = user;
    res.json({ 
      accessToken,
      refreshToken,
      user: userWithoutPassword 
    });
  } else {
    res.status(401).json({ error: "Неверный пароль" });
  }
});

// Обновление токенов (доступ: Гость)
app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }
  
  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
  
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    
    if (payload.type !== 'refresh') {
      return res.status(401).json({ error: "Invalid token type" });
    }
    
    const user = findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    if (user.isActive === false) {
      return res.status(403).json({ error: "Account blocked" });
    }
    
    refreshTokens.delete(refreshToken);
    
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);
    
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
    
  } catch (err) {
    refreshTokens.delete(refreshToken);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// Выход (доступ: Пользователь)
app.post("/api/auth/logout", authMiddleware, (req, res) => {
  const { refreshToken } = req.body;
  
  if (refreshToken) {
    refreshTokens.delete(refreshToken);
  }
  
  res.json({ success: true, message: "Logged out successfully" });
});

// Получение текущего пользователя (доступ: Пользователь)
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const userId = req.user.sub;
  const user = findUserById(userId);
  
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { hashedPassword: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// ============ МАРШРУТЫ ДЛЯ УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ (только Администратор) ============

// Получить список всех пользователей (доступ: Администратор)
app.get("/api/users", authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const usersWithoutPasswords = users.map(({ hashedPassword, ...user }) => user);
  res.json(usersWithoutPasswords);
});

// Получить пользователя по ID (доступ: Администратор)
app.get("/api/users/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const { id } = req.params;
  const user = findUserById(id);
  
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  
  const { hashedPassword, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// Обновить информацию пользователя (доступ: Администратор)
app.put("/api/users/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, role, isActive } = req.body;
  
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }
  
  // Нельзя изменить роль администратора
  if (users[userIndex].role === ROLES.ADMIN && role !== ROLES.ADMIN) {
    return res.status(403).json({ error: "Cannot change admin role" });
  }
  
  if (first_name) users[userIndex].first_name = first_name.trim();
  if (last_name) users[userIndex].last_name = last_name.trim();
  if (role && [ROLES.USER, ROLES.SELLER, ROLES.ADMIN].includes(role)) {
    users[userIndex].role = role;
  }
  if (isActive !== undefined) users[userIndex].isActive = isActive;
  
  writeData(USERS_FILE, users);
  
  const { hashedPassword, ...userWithoutPassword } = users[userIndex];
  res.json(userWithoutPassword);
});

// Заблокировать пользователя (доступ: Администратор)
app.delete("/api/users/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const { id } = req.params;
  
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }
  
  // Нельзя заблокировать администратора
  if (users[userIndex].role === ROLES.ADMIN) {
    return res.status(403).json({ error: "Cannot block admin user" });
  }
  
  // Мягкое удаление - блокировка аккаунта
  users[userIndex].isActive = false;
  writeData(USERS_FILE, users);
  
  res.status(204).send();
});

// ============ МАРШРУТЫ ДЛЯ ТОВАРОВ ============

// Получение всех товаров (доступ: Пользователь и выше)
app.get("/api/products", authMiddleware, roleMiddleware([ROLES.USER, ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
  res.json(products);
});

// Получение товара по ID (доступ: Пользователь и выше)
app.get("/api/products/:id", authMiddleware, roleMiddleware([ROLES.USER, ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
  const id = req.params.id;
  const product = findProductOr404(id, res);
  if (!product) return;
  res.json(product);
});

// Создание товара (доступ: Продавец и выше)
app.post("/api/products", authMiddleware, roleMiddleware([ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
  const { title, category, description, price } = req.body;

  if (!title?.trim() || !category?.trim() || !description?.trim() || price === undefined) {
    return res.status(400).json({ error: "Все поля обязательны" });
  }

  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: "Цена должна быть положительным числом" });
  }

  const newProduct = {
    id: nanoid(8),
    title: title.trim(),
    category: category.trim(),
    description: description.trim(),
    price: Number(price),
    createdBy: req.user.sub,
    createdAt: new Date().toISOString()
  };

  products.push(newProduct);
  writeData(PRODUCTS_FILE, products);

  res.status(201).json(newProduct);
});

// Обновление товара (доступ: Продавец и выше)
app.put("/api/products/:id", authMiddleware, roleMiddleware([ROLES.SELLER, ROLES.ADMIN]), (req, res) => {
  const id = req.params.id;
  const { title, category, description, price } = req.body;

  const productIndex = products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  if (!title?.trim() || !category?.trim() || !description?.trim() || price === undefined) {
    return res.status(400).json({ error: "Все поля обязательны" });
  }

  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: "Цена должна быть положительным числом" });
  }

  const updatedProduct = {
    ...products[productIndex],
    title: title.trim(),
    category: category.trim(),
    description: description.trim(),
    price: Number(price),
    updatedAt: new Date().toISOString()
  };

  products[productIndex] = updatedProduct;
  writeData(PRODUCTS_FILE, products);

  res.json(updatedProduct);
});

// Удаление товара (доступ: Администратор)
app.delete("/api/products/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res) => {
  const id = req.params.id;
  
  const exists = products.some(p => p.id === id);
  if (!exists) {
    return res.status(404).json({ error: "Product not found" });
  }

  products = products.filter(p => p.id !== id);
  writeData(PRODUCTS_FILE, products);

  res.status(204).send();
});

// 404 для всех остальных маршрутов
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`✅ Сервер запущен на http://localhost:${port}`);
  console.log(``);
  console.log(`📋 МАРШРУТЫ С РОЛЯМИ:`);
  console.log(`   🔓 POST   /api/auth/register - регистрация (Гость)`);
  console.log(`   🔓 POST   /api/auth/login - вход (Гость)`);
  console.log(`   🔓 POST   /api/auth/refresh - обновление токенов (Гость)`);
  console.log(`   🔐 GET    /api/auth/me - текущий пользователь (Пользователь+)`);
  console.log(`   🔐 GET    /api/users - список пользователей (Администратор)`);
  console.log(`   🔐 GET    /api/users/:id - пользователь по ID (Администратор)`);
  console.log(`   🔐 PUT    /api/users/:id - обновить пользователя (Администратор)`);
  console.log(`   🔐 DELETE /api/users/:id - заблокировать пользователя (Администратор)`);
  console.log(`   🔐 GET    /api/products - все товары (Пользователь+)`);
  console.log(`   🔐 GET    /api/products/:id - товар по ID (Пользователь+)`);
  console.log(`   🔐 POST   /api/products - создать товар (Продавец+)`);
  console.log(`   🔐 PUT    /api/products/:id - обновить товар (Продавец+)`);
  console.log(`   🔐 DELETE /api/products/:id - удалить товар (Администратор)`);
  console.log(``);
  console.log(`👥 Роли: user (просмотр), seller (управление товарами), admin (всё)`);
  console.log(`🔑 Администратор по умолчанию: admin@shop.com / admin123`);
  
  // Создание тестовых товаров
  if (products.length === 0) {
    const sampleProducts = [
      { id: nanoid(8), title: "Ноутбук Lenovo", category: "Электроника", description: "Мощный ноутбук для работы и игр", price: 65999 },
      { id: nanoid(8), title: "Наушники Sony", category: "Аксессуары", description: "Беспроводные наушники с шумоподавлением", price: 12990 },
      { id: nanoid(8), title: "Кофеварка DeLonghi", category: "Бытовая техника", description: "Автоматическая кофеварка для эспрессо", price: 45990 }
    ];
    products = sampleProducts;
    writeData(PRODUCTS_FILE, products);
    console.log(`✅ Создано ${products.length} тестовых товаров`);
  }
});