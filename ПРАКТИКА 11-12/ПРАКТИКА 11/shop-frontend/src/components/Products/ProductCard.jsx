import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Products.css';

export default function ProductCard({ product, onDelete, canEdit }) {
  const { hasRole } = useAuth();
  const canDelete = hasRole(['admin']);

  return (
    <div className="product-card">
      <div className="product-card-content">
        <h3 className="product-title">{product.title}</h3>
        <p className="product-category">{product.category}</p>
        <p className="product-description">{product.description}</p>
        <div className="product-price">{product.price.toLocaleString()} ₽</div>
        
        <div className="product-actions">
          <Link to={`/products/${product.id}`} className="btn btn-secondary">
            Подробнее
          </Link>
          {canEdit && (
            <Link to={`/products/${product.id}/edit`} className="btn btn-primary">
              Редактировать
            </Link>
          )}
          {canDelete && onDelete && (
            <button onClick={() => onDelete(product.id)} className="btn btn-danger">
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}