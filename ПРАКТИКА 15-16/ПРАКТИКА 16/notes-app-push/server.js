const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// ============ VAPID КЛЮЧИ ============
// Сгенерируйте свои командой: npx web-push generate-vapid-keys
const vapidKeys = {
  publicKey: 'BL8ugzkk1zLpFg2rui1EUoZlHcITear1JOFoZ37XkNOwCrJZv6qTWN3rAK8fqjKcrWyASyPvAIqKEGmA-fsnHW4',
  privateKey: 'z8hd8_xXoE8kIbw0EU_M6UTSxZiiH4KFCKdHr252s4Y'
};

// Настройка web-push
webpush.setVapidDetails(
  'mailto:your-email@example.com', // Замените на свой email
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// ============ НАСТРОЙКА EXPRESS ============
const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, './')));

// ============ ХРАНИЛИЩЕ ПОДПИСОК ============
let subscriptions = [];

// ============ ЭНДПОИНТЫ ДЛЯ PUSH ============
// Сохранение подписки
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  const exists = subscriptions.some(s => s.endpoint === subscription.endpoint);
  
  if (!exists) {
    subscriptions.push(subscription);
    console.log('✅ Новая push-подписка добавлена');
  }
  
  res.status(201).json({ message: 'Subscription saved' });
});

// Удаление подписки
app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  subscriptions = subscriptions.filter(s => s.endpoint !== endpoint);
  console.log('❌ Push-подписка удалена');
  res.status(200).json({ message: 'Subscription removed' });
});

// Получение всех подписок (для отладки)
app.get('/subscriptions', (req, res) => {
  res.json(subscriptions);
});

// ============ WEBSOCKET (SOCKET.IO) ============
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Отправка push-уведомления всем подписанным клиентам
async function sendPushNotification(title, body) {
  const payload = JSON.stringify({ title, body });
  const options = { TTL: 60 }; // Уведомление живет 60 секунд

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(subscription, payload, options);
      console.log('📨 Push-уведомление отправлено');
    } catch (error) {
      console.error('❌ Ошибка отправки push:', error);
      // Если подписка невалидна, удаляем её
      if (error.statusCode === 410) {
        subscriptions = subscriptions.filter(s => s.endpoint !== subscription.endpoint);
      }
    }
  }
}

io.on('connection', (socket) => {
  console.log('🟢 Клиент подключён:', socket.id);

  // Обработка события 'newTask' от клиента
  socket.on('newTask', async (task) => {
    console.log('📝 Новая задача от клиента:', task);
    
    // Рассылаем событие всем остальным клиентам (кроме отправителя)
    socket.broadcast.emit('taskAdded', task);
    
    // Отправляем push-уведомление всем подписанным клиентам
    await sendPushNotification('📝 Новая заметка', task.text);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Клиент отключён:', socket.id);
  });
});

// ============ ЗАПУСК СЕРВЕРА ============
server.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
  console.log(`📡 WebSocket: http://localhost:${PORT}`);
  console.log(`🔑 Публичный VAPID ключ: ${vapidKeys.publicKey.substring(0, 30)}...`);
});