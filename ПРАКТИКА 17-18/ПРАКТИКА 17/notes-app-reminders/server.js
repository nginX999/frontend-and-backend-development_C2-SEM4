const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// ЗАМЕНИТЕ НА СВОИ VAPID КЛЮЧИ!
const vapidKeys = {
  publicKey: 'BOF91qpzHyA-QsfUMGPoDPid08yMGVRloicGcBULcs3oLLK7iNjNiNBkz__2gO_erx35IWAFJ4GeZYLZvWBHTI4',
  privateKey: 'dZ2gAH-qKT8E67srOVEYldAQ-vu6vEU_nqOI8po7nMk'
};

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, './')));

let subscriptions = [];
const reminders = new Map();

app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  const exists = subscriptions.some(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subscriptions.push(subscription);
    console.log('✅ Новая push-подписка');
  }
  res.status(201).json({ message: 'OK' });
});

app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  subscriptions = subscriptions.filter(s => s.endpoint !== endpoint);
  console.log('❌ Подписка удалена');
  res.status(200).json({ message: 'OK' });
});

app.post('/snooze', (req, res) => {
  const { reminderId } = req.body;
  
  if (!reminderId || !reminders.has(parseInt(reminderId))) {
    return res.status(400).json({ error: 'Reminder not found' });
  }
  
  const id = parseInt(reminderId);
  const reminder = reminders.get(id);
  
  clearTimeout(reminder.timeoutId);
  
  const snoozeDelay = 5 * 60 * 1000;
  const newTimeoutId = setTimeout(() => {
    const payload = JSON.stringify({
      title: '⏰ Напоминание',
      body: reminder.text,
      reminderId: id
    });
    
    subscriptions.forEach(sub => {
      webpush.sendNotification(sub, payload).catch(err => console.error('Push error:', err));
    });
    
    reminders.delete(id);
    console.log(`📨 Отложенное напоминание отправлено для ${id}`);
  }, snoozeDelay);
  
  reminders.set(id, {
    timeoutId: newTimeoutId,
    text: reminder.text,
    reminderTime: Date.now() + snoozeDelay
  });
  
  console.log(`⏰ Напоминание ${id} отложено на 5 минут`);
  res.status(200).json({ message: 'Reminder snoozed for 5 minutes' });
});

async function sendPushNotification(title, body, reminderId = null) {
  const payload = JSON.stringify({ title, body, reminderId });
  
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
      console.log(`📨 Push отправлен: ${title}`);
    } catch (err) {
      console.error('❌ Ошибка push:', err.message);
      if (err.statusCode === 410) {
        subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
      }
    }
  }
}

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
  console.log('🟢 Клиент подключён:', socket.id);

  socket.on('newTask', (task) => {
    console.log('📝 Новая задача:', task.text);
    socket.broadcast.emit('taskAdded', task);
  });

  socket.on('newReminder', (reminder) => {
    const { id, text, reminderTime } = reminder;
    console.log(`⏰ Новое напоминание: "${text}" на ${new Date(reminderTime).toLocaleString()}`);
    
    const delay = reminderTime - Date.now();
    
    if (delay <= 0) {
      console.log('❌ Время напоминания уже прошло');
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      console.log(`🔔 Сработало напоминание для заметки ${id}: ${text}`);
      await sendPushNotification('⏰ Напоминание', text, id);
      reminders.delete(id);
    }, delay);
    
    reminders.set(id, {
      timeoutId,
      text,
      reminderTime
    });
    
    console.log(`✅ Напоминание запланировано на ${new Date(reminderTime).toLocaleString()}`);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Клиент отключён:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
  console.log(`📡 WebSocket: http://localhost:${PORT}`);
});