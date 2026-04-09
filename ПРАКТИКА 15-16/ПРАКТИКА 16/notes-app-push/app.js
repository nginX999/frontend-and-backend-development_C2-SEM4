// ============ DOM ЭЛЕМЕНТЫ ============
const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const enablePushBtn = document.getElementById('enable-push');
const disablePushBtn = document.getElementById('disable-push');
const footerButtons = document.getElementById('footer-buttons');

// ============ WEBSOCKET (SOCKET.IO) ============
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('🔌 WebSocket подключён:', socket.id);
  showToast('🔌 WebSocket подключён', '#10b981');
});

socket.on('disconnect', () => {
  console.log('🔌 WebSocket отключён');
  showToast('🔌 WebSocket отключён', '#ef4444');
});

// Получение события о новой задаче от других клиентов
socket.on('taskAdded', (task) => {
  console.log('📨 Новая задача от другого клиента:', task);
  showToast(`📝 Новая заметка: ${task.text}`, '#667eea');
});

// ============ TOAST УВЕДОМЛЕНИЯ ============
function showToast(message, color = '#667eea') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.background = color;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============ ОБНОВЛЕНИЕ СТАТУСА СЕТИ ============
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

// ============ НАВИГАЦИЯ ============
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
    
    if (page === 'home') {
      initNotes();
    }
  } catch (err) {
    console.error(err);
    contentDiv.innerHTML = '<div class="error">❌ Ошибка загрузки страницы</div>';
  }
}

// ============ РАБОТА С ЗАМЕТКАМИ ============
function loadNotes() {
  return JSON.parse(localStorage.getItem('notes') || '[]');
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
  
  notesList.innerHTML = notes.map((note, index) => `
    <div class="note-item" data-index="${index}">
      <span class="note-text">${escapeHtml(note.text || note)}</span>
      <button class="delete-btn" data-index="${index}">🗑️</button>
    </div>
  `).join('');
  
  if (notesCounter) notesCounter.textContent = `Заметок: ${notes.length}`;
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
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

function addNote(text) {
  const notes = loadNotes();
  const newNote = { id: Date.now(), text, datetime: new Date().toLocaleString() };
  notes.push(newNote);
  localStorage.setItem('notes', JSON.stringify(notes));
  renderNotes();
  
  // ОТПРАВКА СОБЫТИЯ ЧЕРЕЗ WEBSOCKET
  socket.emit('newTask', { id: newNote.id, text, datetime: newNote.datetime });
  console.log('📤 Событие newTask отправлено на сервер');
  
  // Визуальная обратная связь
  const btn = document.querySelector('#note-form button[type="submit"]');
  if (btn) {
    const originalText = btn.textContent;
    btn.textContent = '✓ Готово!';
    setTimeout(() => { btn.textContent = originalText; }, 1000);
  }
}

function deleteNote(index) {
  const notes = loadNotes();
  notes.splice(index, 1);
  localStorage.setItem('notes', JSON.stringify(notes));
  renderNotes();
}

function initNotes() {
  renderNotes();
  
  const form = document.getElementById('note-form');
  const input = document.getElementById('note-input');
  
  if (!form) return;
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input?.value.trim();
    if (text === '') {
      alert('Введите текст заметки');
      return;
    }
    addNote(text);
    if (input) input.value = '';
    input?.focus();
  });
}

// ============ PUSH УВЕДОМЛЕНИЯ ============
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

// Публичный VAPID ключ (скопируйте из терминала после генерации)
const VAPID_PUBLIC_KEY = 'BL8ugzkk1zLpFg2rui1EUoZlHcITear1JOFoZ37XkNOwCrJZv6qTWN3rAK8fqjKcrWyASyPvAIqKEGmA-fsnHW4';

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Push-уведомления не поддерживаются');
    return;
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
    }
  } catch (err) {
    console.error('❌ Ошибка подписки на push:', err);
    showToast('❌ Ошибка включения уведомлений', '#ef4444');
  }
}

async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  
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

// ============ РЕГИСТРАЦИЯ SERVICE WORKER И НАСТРОЙКА КНОПОК ============
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker зарегистрирован:', registration.scope);
      
      // Показываем кнопки уведомлений
      if (enablePushBtn && disablePushBtn) {
        enablePushBtn.style.display = 'inline-block';
        
        // Проверяем, есть ли уже подписка
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          enablePushBtn.style.display = 'none';
          disablePushBtn.style.display = 'inline-block';
        }
        
        enablePushBtn.addEventListener('click', async () => {
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
          await subscribeToPush();
          enablePushBtn.style.display = 'none';
          disablePushBtn.style.display = 'inline-block';
        });
        
        disablePushBtn.addEventListener('click', async () => {
          await unsubscribeFromPush();
          disablePushBtn.style.display = 'none';
          enablePushBtn.style.display = 'inline-block';
        });
      }
      
    } catch (err) {
      console.error('❌ Ошибка регистрации Service Worker:', err);
    }
  });
}

// ============ ОБРАБОТЧИКИ НАВИГАЦИИ ============
homeBtn?.addEventListener('click', () => {
  setActiveButton('home-btn');
  loadContent('home');
});

aboutBtn?.addEventListener('click', () => {
  setActiveButton('about-btn');
  loadContent('about');
});

// Загружаем главную страницу по умолчанию
loadContent('home');