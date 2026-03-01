import React from 'react';

export default function ProductItem({ product, onEdit, onDelete }) {
  return (
    <div className="productRow">
      <div className="productMain">
        <div className="productName">{product.name}</div>
        <div className="productPrice">{product.price} ₽</div>
      </div>
      <div className="productActions">
        <button onClick={() => onEdit(product)}>Редактировать</button>
        <button onClick={() => onDelete(product.id)}>Удалить</button>
      </div>
    </div>
  );
}