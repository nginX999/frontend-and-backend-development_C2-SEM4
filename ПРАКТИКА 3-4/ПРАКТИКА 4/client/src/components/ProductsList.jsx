import React from 'react';
import ProductItem from './ProductItem';

export default function ProductsList({ products, onEdit, onDelete }) {
  if (!products || products.length === 0) {
    return <div className="empty">Нет товаров</div>;
  }

  return (
    <div className="list">
      {products.map(product => (
        <ProductItem
          key={product.id}
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}