const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
const port = 3000;

// Начальные данные (10 товаров)
let products = [
  { id: nanoid(6), name: 'Ноутбук', category: 'Электроника', description: 'Мощный игровой ноутбук', price: 1200, stock: 5, rating: 4.5, image: 'https://via.placeholder.com/150' },
  { id: nanoid(6), name: 'Смартфон', category: 'Электроника', description: 'Флагманский смартфон', price: 800, stock: 10, rating: 4.7, image: 'https://via.placeholder.com/150' },
  { id: nanoid(6), name: 'Наушники', category: 'Аксессуары', description: 'Беспроводные наушники', price: 150, stock: 20, rating: 4.3, image: 'https://via.placeholder.com/150' },
  { id: nanoid(6), name: 'Клавиатура', category: 'Аксессуары', description: 'Механическая клавиатура', price: 100, stock: 15, rating: 4.6, image: 'https://via.placeholder.com/150' },
  { id: nanoid(6), name: 'Монитор', category: 'Электроника', description: '4K монитор 27 дюймов', price: 400, stock: 7, rating: 4.4, image: 'https://via.placeholder.com/150' },
  { id: nanoid(6), name: 'Мышь', category: 'Аксессуары', description: 'Игровая мышь', price: 50, stock: 25, rating: 4.2, image: 'https://via.placeholder.com/150' },
  { id: nanoid(6), name: 'Планшет', category: 'Электроника', description: 'Для рисования и работы', price: 600, stock: 4, rating: 4.8, image: 'https://via.placeholder.com/150' },
  { id: nanoid(6), name: 'Внешний диск', category: 'Хранение', description: '1 TB SSD', price: 120, stock: 12, rating: 4.5, image: 'https://via.placeholder.com/150' },
  { id: nanoid(6), name: 'Принтер', category: 'Периферия', description: 'Лазерный принтер', price: 250, stock: 6, rating: 4.1, image: 'https://via.placeholder.com/150' },
  { id: nanoid(6), name: 'Веб-камера', category: 'Аксессуары', description: 'Full HD камера', price: 80, stock: 9, rating: 4.0, image: 'https://via.placeholder.com/150' },
];

// Middleware
app.use(cors({
  origin: '*'
}));
app.use(express.json());

// Логирование запросов
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      console.log('Body:', req.body);
    }
  });
  next();
});

// Вспомогательная функция поиска товара
function findProductOr404(id, res) {
  const product = products.find(p => p.id === id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return null;
  }
  return product;
}

// --- Маршруты для товаров ---

// POST /api/products – создание товара
app.post('/api/products', (req, res) => {
  const { name, category, description, price, stock, rating, image } = req.body;

  // Базовая валидация
  if (!name || !category || !description || price === undefined || stock === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newProduct = {
    id: nanoid(6),
    name: name.trim(),
    category: category.trim(),
    description: description.trim(),
    price: Number(price),
    stock: Number(stock),
    rating: rating ? Number(rating) : null,
    image: image || null,
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// GET /api/products – список всех товаров
app.get('/api/products', (req, res) => {
  res.json(products);
});

// GET /api/products/:id – товар по id
app.get('/api/products/:id', (req, res) => {
  const id = req.params.id;
  const product = findProductOr404(id, res);
  if (!product) return;
  res.json(product);
});

// PATCH /api/products/:id – обновление товара
app.patch('/api/products/:id', (req, res) => {
  const id = req.params.id;
  const product = findProductOr404(id, res);
  if (!product) return;

  const { name, category, description, price, stock, rating, image } = req.body;

  if (name !== undefined) product.name = name.trim();
  if (category !== undefined) product.category = category.trim();
  if (description !== undefined) product.description = description.trim();
  if (price !== undefined) product.price = Number(price);
  if (stock !== undefined) product.stock = Number(stock);
  if (rating !== undefined) product.rating = rating ? Number(rating) : null;
  if (image !== undefined) product.image = image;

  res.json(product);
});

// DELETE /api/products/:id – удаление товара
app.delete('/api/products/:id', (req, res) => {
  const id = req.params.id;
  const exists = products.some(p => p.id === id);
  if (!exists) return res.status(404).json({ error: 'Product not found' });

  products = products.filter(p => p.id !== id);
  res.status(204).send();
});

// 404 для несуществующих маршрутов
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});