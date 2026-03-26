import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Products.css';

export default function ProductCard({ product, onEdit, onDelete }) {
  const { hasRole } = useAuth();
  const canEdit = hasRole(['seller', 'admin']);
  const canDelete = hasRole(['admin']);

  return (
    <div className="product-card">
      {/* БЛОК С ИЗОБРАЖЕНИЕМ */}
      <div className="product-image">
        <img 
          src={product.image || "https://via.placeholder.com/300x200?text=Нет+фото"} 
          alt={product.title}
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/300x200?text=Ошибка+загрузки";
          }}
        />
      </div>
      {/* КОНЕЦ БЛОКА ИЗОБРАЖЕНИЯ */}

      <div className="product-content">
        <h3 className="product-title">{product.title}</h3>
        <p className="product-category">{product.category}</p>
        <p className="product-description">{product.description}</p>
        <div className="product-price">{product.price.toLocaleString()} ₽</div>
        <div className="product-stock">В наличии: {product.stock} шт.</div>
        
        <div className="product-actions">
          <Link to={`/products/${product.id}`} className="btn btn-secondary">
            Подробнее
          </Link>
          {canEdit && onEdit && (
            <button 
              onClick={() => onEdit(product)}
              className="btn btn-primary"
            >
              Редактировать
            </button>
          )}
          {canDelete && onDelete && (
            <button 
              onClick={() => onDelete(product.id)}
              className="btn btn-danger"
            >
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}