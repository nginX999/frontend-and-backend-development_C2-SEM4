import React, { useState, useEffect } from 'react';

export default function ProductModal({ open, mode, initialProduct, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (initialProduct) {
      setName(initialProduct.name || '');
      setPrice(initialProduct.price?.toString() || '');
    } else {
      setName('');
      setPrice('');
    }
  }, [initialProduct, open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      id: initialProduct?.id,
      name: name.trim(),
      price: Number(price),
    });
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{mode === 'edit' ? 'Редактировать' : 'Создать'} товар</h2>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Название"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <input
            placeholder="Цена"
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            required
          />
          <button type="submit">Сохранить</button>
          <button type="button" onClick={onClose}>Отмена</button>
        </form>
      </div>
    </div>
  );
}