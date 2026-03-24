const express = require('express');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3001;

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

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shop API',
      version: '1.0.0',
      description: 'API для интернет-магазина с авторизацией',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Локальный сервер',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'abc123' },
            email: { type: 'string', example: 'user@example.com' },
            first_name: { type: 'string', example: 'Иван' },
            last_name: { type: 'string', example: 'Петров' }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'prod123' },
            title: { type: 'string', example: 'Смартфон' },
            category: { type: 'string', example: 'Электроника' },
            description: { type: 'string', example: 'Отличный смартфон' },
            price: { type: 'number', example: 29999 }
          }
        }
      }
    }
  },
  apis: ['./app.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middleware для логирования запросов
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      console.log('Body:', req.body);
    }
  });
  next();
});

// Функции хеширования
async function hashPassword(password) {
  const rounds = 10;
  return bcrypt.hash(password, rounds);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

// Вспомогательные функции
function findUserByEmail(email, res) {
  const user = users.find(u => u.email === email);
  if (!user) {
    res?.status(404).json({ error: "User not found" });
    return null;
  }
  return user;
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

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - first_name
 *               - last_name
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ivan@example.com
 *               first_name:
 *                 type: string
 *                 example: Иван
 *               last_name:
 *                 type: string
 *                 example: Петров
 *               password:
 *                 type: string
 *                 format: password
 *                 example: qwerty123
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Неверные данные или email уже существует
 */
app.post("/api/auth/register", async (req, res) => {
  const { email, first_name, last_name, password } = req.body;

  // Валидация
  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({ error: "Все поля обязательны для заполнения" });
  }

  // Проверка формата email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Некорректный формат email" });
  }

  // Проверка длины пароля
  if (password.length < 6) {
    return res.status(400).json({ error: "Пароль должен содержать минимум 6 символов" });
  }

  // Проверка уникальности email
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

  // Не возвращаем хеш пароля
  const { hashedPassword: _, ...userWithoutPassword } = newUser;
  res.status(201).json(userWithoutPassword);
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: ivan@example.com
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Отсутствуют обязательные поля
 *       401:
 *         description: Неверный пароль
 *       404:
 *         description: Пользователь не найден
 */
app.post("/api/auth/login", async (req, res) => {
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
    res.status(200).json({ 
      success: true, 
      user: userWithoutPassword 
    });
  } else {
    res.status(401).json({ error: "Неверный пароль" });
  }
});

// ============ МАРШРУТЫ ДЛЯ ТОВАРОВ ============

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - description
 *               - price
 *             properties:
 *               title:
 *                 type: string
 *                 example: Смартфон Galaxy S23
 *               category:
 *                 type: string
 *                 example: Электроника
 *               description:
 *                 type: string
 *                 example: Флагманский смартфон с отличной камерой
 *               price:
 *                 type: number
 *                 example: 79999
 *     responses:
 *       201:
 *         description: Товар создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Неверные данные
 */
app.post("/api/products", (req, res) => {
  const { title, category, description, price } = req.body;

  // Валидация
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

  res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список всех товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get("/api/products", (req, res) => {
  res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Товар найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.get("/api/products/:id", (req, res) => {
  const id = req.params.id;
  const product = findProductOr404(id, res);
  if (!product) return;
  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар полностью
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - description
 *               - price
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Товар обновлён
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Неверные данные
 *       404:
 *         description: Товар не найден
 */
app.put("/api/products/:id", (req, res) => {
  const id = req.params.id;
  const { title, category, description, price } = req.body;

  const productIndex = products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  // Валидация
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

  res.json(updatedProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     responses:
 *       204:
 *         description: Товар удалён
 *       404:
 *         description: Товар не найден
 */
app.delete("/api/products/:id", (req, res) => {
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
  console.log(`Сервер запущен на http://localhost:${port}`);
  console.log(`Swagger UI доступен по адресу http://localhost:${port}/api-docs`);
  
  // Создание тестовых данных, если их нет
  if (products.length === 0) {
    const sampleProducts = [
      { id: nanoid(8), title: "Ноутбук Lenovo", category: "Электроника", description: "Мощный ноутбук для работы и игр", price: 65999 },
      { id: nanoid(8), title: "Наушники Sony", category: "Аксессуары", description: "Беспроводные наушники с шумоподавлением", price: 12990 },
      { id: nanoid(8), title: "Кофеварка DeLonghi", category: "Бытовая техника", description: "Автоматическая кофеварка для эспрессо", price: 45990 },
      { id: nanoid(8), title: "Кроссовки Nike", category: "Обувь", description: "Спортивная обувь для бега", price: 8990 },
      { id: nanoid(8), title: "Книга JavaScript", category: "Книги", description: "Изучение JavaScript с нуля", price: 2490 },
      { id: nanoid(8), title: "Смарт-часы Apple Watch", category: "Электроника", description: "Умные часы с мониторингом здоровья", price: 32990 },
      { id: nanoid(8), title: "Фитнес-браслет Xiaomi", category: "Электроника", description: "Мониторинг активности и сна", price: 2990 },
      { id: nanoid(8), title: "Рюкзак городской", category: "Аксессуары", description: "Вместительный рюкзак для ноутбука", price: 3990 },
      { id: nanoid(8), title: "Набор отверток", category: "Инструменты", description: "Набор из 12 отверток", price: 1290 },
      { id: nanoid(8), title: "Зарядное устройство", category: "Электроника", description: "Быстрая зарядка для телефона", price: 1590 }
    ];
    products = sampleProducts;
    writeData(PRODUCTS_FILE, products);
    console.log("Созданы тестовые товары");
  }
});