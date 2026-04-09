// ============ DOM ЭЛЕМЕНТЫ ============
const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const enablePushBtn = document.getElementById('enable-push');
const disablePushBtn = document.getElementById('disable-push');

// ============ WEBSOCKET ============
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('🔌 WebSocket подключён');
  showToast('🔌 WebSocket подключён', '#10b981');
});

socket.on('disconnect', () => {
  console.log('🔌 WebSocket отключён');
  showToast('🔌 WebSocket отключён', '#ef4444');
});

socket.on('taskAdded', (task) => {
  console.log('📨 Новая задача от другого клиента:', task);
  showToast(`📝 ${task.text}`, '#667eea');
});

function showToast(message, color = '#667eea') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px;
    background: ${color}; color: white;
    padding: 12px 20px; border-radius: 12px;
    font-size: 14px; z-index: 1001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function updateNetworkStatus() {
  if (navigator.onLine) {
    statusDot.className = 'status-dot';
    statusText.textContent = 'Онлайн';
  } else {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Офлайн';
  }
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
updateNetworkStatus();

function setActiveButton(activeId) {
  [homeBtn, aboutBtn].forEach(btn => btn.classList.remove('active'));
  document.getElementById(activeId).classList.add('active');
}

async function loadContent(page) {
  try {
    const response = await fetch(`/content/${page}.html`);
    if (!response.ok) throw new Error('Страница не найдена');
    const html = await response.text();
    contentDiv.innerHTML = html;
    if (page === 'home') initNotes();
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = '<div class="error">❌ Ошибка загрузки страницы</div>';
  }
}

function loadNotes() {
  return JSON.parse(localStorage.getItem('notes') || '[]');
}

function saveNotes(notes) {
  localStorage.setItem('notes', JSON.stringify(notes));
}

function renderNotes() {
  const notes = loadNotes();
  const notesList = document.getElementById('notes-list');
  const notesCounter = document.getElementById('notes-counter');
  
  if (!notesList) return;
  
  if (notes.length === 0) {
    notesList.innerHTML = '<div class="empty-state">✨ Нет заметок. Добавьте первую!</div>';
    if (notesCounter) notesCounter.textContent = 'Заметок: 0';
    return;
  }
  
  notesList.innerHTML = notes.map((note, index) => {
    let reminderHtml = '';
    if (note.reminder) {
      reminderHtml = `<div class="note-reminder">⏰ Напоминание: ${new Date(note.reminder).toLocaleString()}</div>`;
    }
    return `
      <div class="note-item" data-index="${index}">
        <div class="note-content">
          <div class="note-text">${escapeHtml(note.text)}</div>
          ${reminderHtml}
        </div>
        <button class="delete-btn" data-index="${index}">🗑️</button>
      </div>
    `;
  }).join('');
  
  if (notesCounter) notesCounter.textContent = `Заметок: ${notes.length}`;
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      deleteNote(index);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function addNote(text, reminder = null) {
  const notes = loadNotes();
  const newNote = { 
    id: Date.now(), 
    text: text, 
    datetime: new Date().toLocaleString(), 
    reminder: reminder 
  };
  notes.push(newNote);
  saveNotes(notes);
  renderNotes();
  
  // Отправляем через WebSocket
  socket.emit('newTask', { id: newNote.id, text: text, datetime: newNote.datetime });
  
  if (reminder) {
    socket.emit('newReminder', { id: newNote.id, text: text, reminderTime: reminder });
    showToast(`⏰ Напоминание установлено на ${new Date(reminder).toLocaleString()}`, '#f59e0b');
  } else {
    showToast('✅ Заметка добавлена', '#10b981');
  }
}

function deleteNote(index) {
  const notes = loadNotes();
  notes.splice(index, 1);
  saveNotes(notes);
  renderNotes();
  showToast('🗑️ Заметка удалена', '#6b7280');
}

// === ОСНОВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ — ИСПРАВЛЕНА ===
function initNotes() {
  console.log('initNotes вызван');
  renderNotes();
  
  // Форма для быстрой заметки
  const form = document.getElementById('note-form');
  const input = document.getElementById('note-input');
  if (form) {
    // Удаляем старый обработчик, чтобы не дублировать
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const textInput = document.getElementById('note-input');
      const text = textInput?.value.trim();
      if (!text) return alert('Введите текст');
      addNote(text);
      if (textInput) textInput.value = '';
    });
  }
  
  // Форма для напоминания
  const reminderForm = document.getElementById('reminder-form');
  const reminderText = document.getElementById('reminder-text');
  const reminderTime = document.getElementById('reminder-time');
  
  if (reminderForm) {
    // Удаляем старый обработчик
    const newReminderForm = reminderForm.cloneNode(true);
    reminderForm.parentNode.replaceChild(newReminderForm, reminderForm);
    
    newReminderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const textInput = document.getElementById('reminder-text');
      const timeInput = document.getElementById('reminder-time');
      const text = textInput?.value.trim();
      const time = timeInput?.value;
      
      console.log('Форма отправлена:', { text, time }); // ОТЛАДКА
      
      if (!text) return alert('Введите текст');
      if (!time) return alert('Выберите дату и время');
      
      const timestamp = new Date(time).getTime();
      console.log('Timestamp:', timestamp, 'Сейчас:', Date.now());
      
      if (isNaN(timestamp)) return alert('Неверный формат даты');
      if (timestamp <= Date.now()) return alert('Время должно быть в будущем');
      
      addNote(text, timestamp);
      if (textInput) textInput.value = '';
      if (timeInput) timeInput.value = '';
    });
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ЗАМЕНИТЕ НА СВОЙ ПУБЛИЧНЫЙ VAPID КЛЮЧ
const VAPID_PUBLIC_KEY = 'BOF91qpzHyA-QsfUMGPoDPid08yMGVRloicGcBULcs3oLLK7iNjNiNBkz__2gO_erx35IWAFJ4GeZYLZvWBHTI4';

async function subscribeToPush() {
  if (!('serviceWorker' in navigator)) {
    alert('Service Worker не поддерживается');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    
    const response = await fetch('/subscribe', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(subscription) 
    });
    
    if (response.ok) {
      console.log('✅ Push-подписка сохранена');
      showToast('🔔 Уведомления включены', '#10b981');
      return true;
    } else {
      throw new Error('Ошибка сохранения подписки');
    }
  } catch (err) {
    console.error('❌ Ошибка подписки:', err);
    showToast('❌ Ошибка включения уведомлений', '#ef4444');
    return false;
  }
}

async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await fetch('/unsubscribe', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ endpoint: subscription.endpoint }) 
      });
      await subscription.unsubscribe();
      console.log('✅ Push-подписка удалена');
      showToast('🔕 Уведомления отключены', '#6b7280');
    }
  } catch (err) {
    console.error('❌ Ошибка отписки:', err);
  }
}

// === РЕГИСТРАЦИЯ SERVICE WORKER И НАСТРОЙКА КНОПОК ===
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker зарегистрирован');
      
      if (enablePushBtn && disablePushBtn) {
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          enablePushBtn.style.display = 'none';
          disablePushBtn.style.display = 'inline-block';
        } else {
          enablePushBtn.style.display = 'inline-block';
          disablePushBtn.style.display = 'none';
        }
        
        enablePushBtn.onclick = async () => {
          console.log('🔘 Нажата кнопка "Включить уведомления"');
          
          if (Notification.permission === 'denied') {
            alert('Уведомления запрещены. Разрешите их в настройках браузера.');
            return;
          }
          
          if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
              alert('Необходимо разрешить уведомления.');
              return;
            }
          }
          
          const success = await subscribeToPush();
          if (success) {
            enablePushBtn.style.display = 'none';
            disablePushBtn.style.display = 'inline-block';
          }
        };
        
        disablePushBtn.onclick = async () => {
          console.log('🔘 Нажата кнопка "Отключить уведомления"');
          await unsubscribeFromPush();
          disablePushBtn.style.display = 'none';
          enablePushBtn.style.display = 'inline-block';
        };
      }
    } catch (err) {
      console.error('❌ Ошибка регистрации Service Worker:', err);
    }
  });
}

// === НАВИГАЦИЯ ===
homeBtn?.addEventListener('click', () => { 
  setActiveButton('home-btn'); 
  loadContent('home'); 
});

aboutBtn?.addEventListener('click', () => { 
  setActiveButton('about-btn'); 
  loadContent('about'); 
});

// Загружаем главную страницу
loadContent('home');