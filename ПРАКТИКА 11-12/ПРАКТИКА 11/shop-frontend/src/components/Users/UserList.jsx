import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Loading from '../Common/Loading';
import './Users.css';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { hasRole } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.getUsers();
      setUsers(response.data);
      setError(null);
    } catch (err) {
      setError('Ошибка загрузки пользователей');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await api.updateUser(userId, { role: newRole });
      loadUsers();
    } catch (err) {
      setError('Ошибка обновления роли');
      console.error(err);
    }
  };

  const handleBlockUser = async (userId) => {
    if (!window.confirm('Заблокировать пользователя?')) return;
    
    try {
      await api.deleteUser(userId);
      loadUsers();
    } catch (err) {
      setError('Ошибка блокировки пользователя');
      console.error(err);
    }
  };

  const getRoleBadgeClass = (role) => {
    switch(role) {
      case 'admin': return 'badge-admin';
      case 'seller': return 'badge-seller';
      default: return 'badge-user';
    }
  };

  const getRoleName = (role) => {
    switch(role) {
      case 'admin': return 'Администратор';
      case 'seller': return 'Продавец';
      default: return 'Пользователь';
    }
  };

  if (loading) return <Loading />;
  if (error) return <div className="error">{error}</div>;

  if (!hasRole(['admin'])) {
    return <div className="error">Доступ запрещён. Только для администратора.</div>;
  }

  return (
    <div className="users-container">
      <div className="users-header">
        <h1>Управление пользователями</h1>
      </div>
      
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Имя</th>
              <th>Фамилия</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={!user.isActive ? 'user-blocked' : ''}>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td>{user.first_name}</td>
                <td>{user.last_name}</td>
                <td>
                  <select 
                    value={user.role} 
                    onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                    disabled={user.role === 'admin'}
                    className={`role-select ${getRoleBadgeClass(user.role)}`}
                  >
                    <option value="user">Пользователь</option>
                    <option value="seller">Продавец</option>
                    <option value="admin" disabled={user.role === 'admin'}>Администратор</option>
                  </select>
                </td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'status-active' : 'status-blocked'}`}>
                    {user.isActive ? 'Активен' : 'Заблокирован'}
                  </span>
                </td>
                <td>
                  {user.role !== 'admin' && (
                    <button 
                      onClick={() => handleBlockUser(user.id)} 
                      className="btn btn-danger btn-sm"
                      disabled={!user.isActive}
                    >
                      {user.isActive ? 'Заблокировать' : 'Уже заблокирован'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}