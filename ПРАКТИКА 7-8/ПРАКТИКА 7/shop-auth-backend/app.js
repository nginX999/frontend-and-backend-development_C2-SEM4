const express = require('express');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Константы для JWT
const JWT_SECRET = "your-secret-key-change-in-production";
const ACCESS_EXPIRES_IN = "15m"; // 15 минут

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

// Функции хеширования
async function hashPassword(password) {
  const rounds = 10;
  return bcrypt.hash(password, rounds);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
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

// ============ JWT MIDDLEWARE ============
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";

  // Ожидаем формат: Bearer <token>
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // сохраняем данные токена в req
    req.user = payload; // { sub, email, first_name, last_name, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ============ ГЛАВНАЯ СТРАНИЦА ============
app.get('/', (req, res) => {
  res.json({ 
    message: 'API интернет-магазина с JWT аутентификацией работает!',
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      me: 'GET /api/auth/me (требуется токен)',
      products: 'GET /api/products',
      createProduct: 'POST /api/products',
      getProduct: 'GET /api/products/:id',
      updateProduct: 'PUT /api/products/:id (требуется токен)',
      deleteProduct: 'DELETE /api/products/:id (требуется токен)'
    }
  });
});

// ============ МАРШРУТЫ АУТЕНТИФИКАЦИИ ============

// Регистрация
app.post("/api/auth/register", async (req, res) => {
  console.log('POST /api/auth/register called with body:', req.body);
  
  const { email, first_name, last_name, password } = req.body;

  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({ error: "Все поля обязательны для заполнения" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Некорректный формат email" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Пароль должен содержать минимум 6 символов" });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: "Пользователь с таким email уже существует" });
  }

  const hashedPassword = await hashPassword(password);
  
  const newUser = {
    id: nanoid(8),
    email,
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    hashedPassword
  };

  users.push(newUser);
  writeData(USERS_FILE, users);

  const { hashedPassword: _, ...userWithoutPassword } = newUser;
  console.log('User created:', userWithoutPassword);
  res.status(201).json(userWithoutPassword);
});

// Вход с выдачей JWT токена
app.post("/api/auth/login", async (req, res) => {
  console.log('POST /api/auth/login called with body:', req.body);
  
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email и пароль обязательны" });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  const isValidPassword = await verifyPassword(password, user.hashedPassword);
  
  if (isValidPassword) {
    // Создание access-токена
    const accessToken = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      },
      JWT_SECRET,
      { expiresIn: ACCESS_EXPIRES_IN }
    );

    const { hashedPassword: _, ...userWithoutPassword } = user;
    
    console.log('Login successful for:', user.email);
    res.status(200).json({ 
      success: true, 
      accessToken,
      user: userWithoutPassword 
    });
  } else {
    console.log('Login failed: invalid password for', email);
    res.status(401).json({ error: "Неверный пароль" });
  }
});

// Защищённый маршрут - получение информации о текущем пользователе
app.get("/api/auth/me", authMiddleware, (req, res) => {
  console.log('GET /api/auth/me called by user:', req.user.email);
  
  const userId = req.user.sub;
  const user = findUserById(userId);
  
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { hashedPassword: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// ============ МАРШРУТЫ ДЛЯ ТОВАРОВ ============

// Создание товара (НЕ защищённый маршрут - доступен всем)
app.post("/api/products", (req, res) => {
  console.log('POST /api/products called with body:', req.body);
  
  const { title, category, description, price } = req.body;

  if (!title?.trim() || !category?.trim() || !description?.trim() || price === undefined) {
    return res.status(400).json({ error: "Все поля обязательны для заполнения" });
  }

  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: "Цена должна быть положительным числом" });
  }

  const newProduct = {
    id: nanoid(8),
    title: title.trim(),
    category: category.trim(),
    description: description.trim(),
    price: Number(price)
  };

  products.push(newProduct);
  writeData(PRODUCTS_FILE, products);

  console.log('Product created:', newProduct);
  res.status(201).json(newProduct);
});

// Получение всех товаров (НЕ защищённый маршрут)
app.get("/api/products", (req, res) => {
  console.log('GET /api/products called');
  res.json(products);
});

// Получение товара по ID (НЕ защищённый маршрут)
app.get("/api/products/:id", (req, res) => {
  console.log(`GET /api/products/${req.params.id} called`);
  
  const id = req.params.id;
  const product = findProductOr404(id, res);
  if (!product) return;
  res.json(product);
});

// Обновление товара (ЗАЩИЩЁННЫЙ маршрут - требует токен)
app.put("/api/products/:id", authMiddleware, (req, res) => {
  console.log(`PUT /api/products/${req.params.id} called by user:`, req.user.email);
  console.log('Body:', req.body);
  
  const id = req.params.id;
  const { title, category, description, price } = req.body;

  const productIndex = products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  if (!title?.trim() || !category?.trim() || !description?.trim() || price === undefined) {
    return res.status(400).json({ error: "Все поля обязательны для заполнения" });
  }

  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: "Цена должна быть положительным числом" });
  }

  const updatedProduct = {
    id,
    title: title.trim(),
    category: category.trim(),
    description: description.trim(),
    price: Number(price)
  };

  products[productIndex] = updatedProduct;
  writeData(PRODUCTS_FILE, products);

  console.log('Product updated:', updatedProduct);
  res.json(updatedProduct);
});

// Удаление товара (ЗАЩИЩЁННЫЙ маршрут - требует токен)
app.delete("/api/products/:id", authMiddleware, (req, res) => {
  console.log(`DELETE /api/products/${req.params.id} called by user:`, req.user.email);
  
  const id = req.params.id;
  
  const exists = products.some(p => p.id === id);
  if (!exists) {
    return res.status(404).json({ error: "Product not found" });
  }

  products = products.filter(p => p.id !== id);
  writeData(PRODUCTS_FILE, products);

  console.log('Product deleted:', id);
  res.status(204).send();
});

// 404 для всех остальных маршрутов
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.path} not found`);
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
  console.log(`🔐 JWT секрет: ${JWT_SECRET}`);
  console.log(`⏱️  Время жизни токена: ${ACCESS_EXPIRES_IN}`);
  console.log(`📝 Проверьте главную страницу: http://localhost:${port}`);
  console.log(`📦 Товаров в базе: ${products.length}`);
  
  // Создание тестовых данных, если их нет
  if (products.length === 0) {
    const sampleProducts = [
      { id: nanoid(8), title: "Ноутбук Lenovo", category: "Электроника", description: "Мощный ноутбук для работы и игр", price: 65999 },
      { id: nanoid(8), title: "Наушники Sony", category: "Аксессуары", description: "Беспроводные наушники с шумоподавлением", price: 12990 },
      { id: nanoid(8), title: "Кофеварка DeLonghi", category: "Бытовая техника", description: "Автоматическая кофеварка для эспрессо", price: 45990 },
      { id: nanoid(8), title: "Смартфон Xiaomi", category: "Электроника", description: "Смартфон с отличной камерой", price: 29990 },
      { id: nanoid(8), title: "Пылесос Dyson", category: "Бытовая техника", description: "Беспроводной пылесос", price: 54990 },
      { id: nanoid(8), title: "Фитнес-браслет", category: "Электроника", description: "Трекер активности", price: 3990 },
      { id: nanoid(8), title: "Набор посуды", category: "Дом", description: "Кастрюли и сковородки", price: 8990 },
      { id: nanoid(8), title: "Книга по JavaScript", category: "Книги", description: "Изучаем JavaScript с нуля", price: 1990 },
      { id: nanoid(8), title: "Рюкзак для ноутбука", category: "Аксессуары", description: "Водонепроницаемый рюкзак", price: 3490 },
      { id: nanoid(8), title: "Настольная лампа", category: "Дом", description: "LED лампа с регулировкой яркости", price: 2490 }
    ];
    products = sampleProducts;
    writeData(PRODUCTS_FILE, products);
    console.log(`✅ Создано ${products.length} тестовых товаров`);
  }
});