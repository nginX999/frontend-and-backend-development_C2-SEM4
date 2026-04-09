// ============ DOM ЭЛЕМЕНТЫ ============
const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');

// ============ PWA УСТАНОВКА ============
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBanner.classList.add('show');
  console.log('✅ Приложение можно установить');
});

installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  
  installBanner.classList.remove('show');
  deferredPrompt.prompt();
  
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`Результат установки: ${outcome}`);
  deferredPrompt = null;
});

window.addEventListener('appinstalled', () => {
  console.log('✅ Приложение установлено!');
  installBanner.classList.remove('show');
});

// ============ ОБНОВЛЕНИЕ СТАТУСА СЕТИ ============
function updateNetworkStatus() {
  if (navigator.onLine) {
    statusDot.className = 'status-dot';
    statusText.textContent = 'Онлайн';
  } else {
    statusDot.className = 'status-dot offline';
    statusText.textContent = 'Офлайн (работает из кэша)';
  }
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
updateNetworkStatus();

// ============ НАВИГАЦИЯ (App Shell) ============
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
    contentDiv.innerHTML = `
      <div class="error" style="text-align: center; padding: 2rem;">
        <p>❌ Ошибка загрузки страницы</p>
        <button onclick="loadContent('home')" class="button primary">Попробовать снова</button>
      </div>
    `;
  }
}

// ============ РАБОТА С ЗАМЕТКАМИ ============
function loadNotes() {
  const notes = JSON.parse(localStorage.getItem('notes') || '[]');
  return notes;
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
      <span class="note-text">${escapeHtml(note)}</span>
      <button class="delete-btn" data-index="${index}">🗑️</button>
    </div>
  `).join('');
  
  if (notesCounter) notesCounter.textContent = `Заметок: ${notes.length}`;
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
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
  notes.push(text);
  localStorage.setItem('notes', JSON.stringify(notes));
  renderNotes();
  
  const btn = document.querySelector('#note-form button[type="submit"]');
  if (btn) {
    const originalText = btn.textContent;
    btn.textContent = '✓ Готово!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 1000);
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
      alert('Пожалуйста, введите текст заметки');
      return;
    }
    
    addNote(text);
    if (input) input.value = '';
    input?.focus();
  });
  
  input?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
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

// ============ РЕГИСТРАЦИЯ SERVICE WORKER ============
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker зарегистрирован:', registration.scope);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 Новый Service Worker устанавливается...');
        
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🆕 Доступна новая версия! Обновите страницу.');
            showUpdateNotification();
          }
        });
      });
      
    } catch (err) {
      console.error('❌ Ошибка регистрации Service Worker:', err);
    }
  });
}

function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    background: #667eea;
    color: white;
    padding: 12px 20px;
    border-radius: 30px;
    font-size: 14px;
    cursor: pointer;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  notification.innerHTML = '🔄 Новая версия доступна. Нажмите для обновления →';
  notification.onclick = () => window.location.reload();
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 8000);
}

// Загружаем главную страницу по умолчанию
loadContent('home');