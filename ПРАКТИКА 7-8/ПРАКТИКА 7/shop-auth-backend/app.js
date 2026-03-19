const express = require('express');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

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

function findProductOr404(id, res) {
  const product = products.find(p => p.id === id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return null;
  }
  return product;
}

// ============ ГЛАВНАЯ СТРАНИЦА ============
app.get('/', (req, res) => {
  res.json({ 
    message: 'API интернет-магазина работает!',
    endpoints: {
      docs: 'http://localhost:3000/api-docs (если установлен Swagger)',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      products: 'GET /api/products',
      createProduct: 'POST /api/products',
      getProduct: 'GET /api/products/:id',
      updateProduct: 'PUT /api/products/:id',
      deleteProduct: 'DELETE /api/products/:id'
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

// Вход
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
    const { hashedPassword: _, ...userWithoutPassword } = user;
    console.log('Login successful:', userWithoutPassword);
    res.status(200).json({ 
      success: true, 
      user: userWithoutPassword 
    });
  } else {
    console.log('Login failed: invalid password');
    res.status(401).json({ error: "Неверный пароль" });
  }
});

// ============ МАРШРУТЫ ДЛЯ ТОВАРОВ ============

// Создание товара
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

// Получение всех товаров
app.get("/api/products", (req, res) => {
  console.log('GET /api/products called');
  res.json(products);
});

// Получение товара по ID
app.get("/api/products/:id", (req, res) => {
  console.log(`GET /api/products/${req.params.id} called`);
  
  const id = req.params.id;
  const product = findProductOr404(id, res);
  if (!product) return;
  res.json(product);
});

// Обновление товара
app.put("/api/products/:id", (req, res) => {
  console.log(`PUT /api/products/${req.params.id} called with body:`, req.body);
  
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

// Удаление товара
app.delete("/api/products/:id", (req, res) => {
  console.log(`DELETE /api/products/${req.params.id} called`);
  
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
  console.log(`📝 Проверьте главную страницу: http://localhost:${port}`);
  console.log(`📦 Товаров в базе: ${products.length}`);
  
  // Создание тестовых данных, если их нет
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