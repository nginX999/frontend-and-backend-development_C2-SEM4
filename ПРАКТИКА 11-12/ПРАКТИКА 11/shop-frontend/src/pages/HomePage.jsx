import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      <div className="hero">
        <h1>Добро пожаловать в Shop Manager</h1>
        <p>Управляйте своими товарами легко и быстро</p>
        
        {!isAuthenticated ? (
          <div className="hero-buttons">
            <Link to="/login" className="btn btn-primary">Войти</Link>
            <Link to="/register" className="btn btn-secondary">Регистрация</Link>
          </div>
        ) : (
          <Link to="/products" className="btn btn-primary">Перейти к товарам</Link>
        )}
      </div>
      
      <style jsx>{`
        .home-page {
          min-height: calc(100vh - 200px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .hero {
          text-align: center;
          color: white;
          padding: 2rem;
        }
        
        .hero h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        
        .hero p {
          font-size: 1.2rem;
          margin-bottom: 2rem;
          opacity: 0.9;
        }
        
        .hero-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        
        .hero-buttons .btn {
          min-width: 150px;
        }
      `}</style>
    </div>
  );
}