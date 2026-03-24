import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          🛍️ Shop Manager
        </Link>
        
        <nav className="nav">
          <Link to="/" className="nav-link">Главная</Link>
          {isAuthenticated && (
            <Link to="/products" className="nav-link">Товары</Link>
          )}
        </nav>
        
        <div className="auth-section">
          {isAuthenticated ? (
            <>
              <span className="user-name">
                {user?.first_name} {user?.last_name}
              </span>
              <button onClick={handleLogout} className="btn-logout">
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-link">Вход</Link>
              <Link to="/register" className="btn-link btn-register">Регистрация</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}