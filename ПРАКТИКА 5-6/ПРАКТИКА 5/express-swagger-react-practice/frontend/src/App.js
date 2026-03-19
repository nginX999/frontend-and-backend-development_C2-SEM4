import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from './api';
import './App.css';

function App() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateUser(editingId, { name, age });
        setEditingId(null);
      } else {
        await createUser({ name, age });
      }
      setName('');
      setAge('');
      fetchUsers();
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setName(user.name);
    setAge(user.age);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Удалить пользователя?')) {
      try {
        await deleteUser(id);
        fetchUsers();
      } catch (error) {
        console.error('Ошибка удаления:', error);
      }
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#333' }}>Управление пользователями</h1>
      
      <p>
        <a 
          href="http://localhost:3000/api-docs" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            background: '#4CAF50', 
            color: 'white', 
            padding: '8px 16px',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          📚 Открыть Swagger документацию
        </a>
      </p>

      <form onSubmit={handleSubmit} style={{ margin: '20px 0', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3>{editingId ? 'Редактировать' : 'Добавить'} пользователя</h3>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя"
            required
            style={{ padding: '8px', marginRight: '10px', width: '200px' }}
          />
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Возраст"
            required
            style={{ padding: '8px', marginRight: '10px', width: '100px' }}
          />
          <button type="submit" style={{ padding: '8px 16px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {editingId ? 'Обновить' : 'Создать'}
          </button>
          {editingId && (
            <button 
              type="button" 
              onClick={() => { setEditingId(null); setName(''); setAge(''); }}
              style={{ padding: '8px 16px', marginLeft: '10px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Отмена
            </button>
          )}
        </div>
      </form>

      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3>Список пользователей</h3>
        {users.length === 0 ? (
          <p>Пользователей пока нет</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {users.map(user => (
              <li key={user.id} style={{ padding: '10px', margin: '5px 0', background: '#f9f9f9', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  <strong>{user.name}</strong> - {user.age} лет
                  <small style={{ marginLeft: '10px', color: '#999' }}>ID: {user.id}</small>
                </span>
                <span>
                  <button onClick={() => handleEdit(user)} style={{ marginRight: '5px', padding: '5px 10px', background: '#FFC107', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(user.id)} style={{ padding: '5px 10px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    🗑️
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
