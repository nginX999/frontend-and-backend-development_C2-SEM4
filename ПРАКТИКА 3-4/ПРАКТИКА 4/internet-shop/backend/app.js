const express = require('express');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
const port = 3000;

let products = [
  { id: nanoid(6), name: 'Гарри Поттер', category: 'Фэнтези', description: 'Книга о мальчике-волшебнике', price: 450, stock: 10 },
  { id: nanoid(6), name: '1984', category: 'Антиутопия', description: 'Роман-предупреждение', price: 350, stock: 5 },
  { id: nanoid(6), name: 'Мастер и Маргарита', category: 'Роман', description: 'Мистика и любовь', price: 500, stock: 7 },
  { id: nanoid(6), name: 'Преступление и наказание', category: 'Классика', description: 'Психологический роман', price: 400, stock: 3 },
  { id: nanoid(6), name: 'Война и мир', category: 'Эпопея', description: 'Том 1 и 2', price: 600, stock: 2 },
  { id: nanoid(6), name: 'Маленький принц', category: 'Сказка', description: 'Философская повесть', price: 300, stock: 15 },
  { id: nanoid(6), name: 'Три товарища', category: 'Роман', description: 'О дружбе и любви', price: 380, stock: 6 },
  { id: nanoid(6), name: 'Анна Каренина', category: 'Классика', description: 'Любовная драма', price: 520, stock: 4 },
  { id: nanoid(6), name: 'Идиот', category: 'Классика', description: 'О добре и зле', price: 470, stock: 8 },
  { id: nanoid(6), name: 'Собачье сердце', category: 'Сатира', description: 'Профессор и Шарик', price: 320, stock: 12 }
];

app.use(express.json());

// CORS
app.use(cors({
  origin: 'http://localhost:3001',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Логирование
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
    if (req.method === 'POST' || req.method === 'PATCH') {
      console.log('Body:', req.body);
    }
  });
  next();
});

// Helpers
function findProductOr404(id, res) {
  const product = products.find(p => p.id === id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return null;
  }
  return product;
}

// Routes
app.post('/api/products', (req, res) => {
  const { name, category, description, price, stock } = req.body;
  const newProduct = {
    id: nanoid(6),
    name: name.trim(),
    category: category.trim(),
    description: description.trim(),
    price: Number(price),
    stock: Number(stock)
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

app.get('/api/products', (req, res) => {
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;
  res.json(product);
});

app.patch('/api/products/:id', (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;

  const { name, category, description, price, stock } = req.body;
  if (name !== undefined) product.name = name.trim();
  if (category !== undefined) product.category = category.trim();
  if (description !== undefined) product.description = description.trim();
  if (price !== undefined) product.price = Number(price);
  if (stock !== undefined) product.stock = Number(stock);

  res.json(product);
});

app.delete('/api/products/:id', (req, res) => {
  const exists = products.some(p => p.id === req.params.id);
  if (!exists) return res.status(404).json({ error: 'Product not found' });
  products = products.filter(p => p.id !== req.params.id);
  res.status(204).send();
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});