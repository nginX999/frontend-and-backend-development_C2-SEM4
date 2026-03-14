import React, { useEffect, useState } from 'react';

export default function ProductModal({ open, mode, initialProduct, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(initialProduct?.name ?? '');
    setCategory(initialProduct?.category ?? '');
    setDescription(initialProduct?.description ?? '');
    setPrice(initialProduct?.price != null ? String(initialProduct.price) : '');
    setStock(initialProduct?.stock != null ? String(initialProduct.stock) : '');
  }, [open, initialProduct]);

  if (!open) return null;

  const title = mode === 'edit' ? 'Редактирование книги' : 'Добавление книги';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Введите название');
    if (!category.trim()) return alert('Введите категорию');
    if (!description.trim()) return alert('Введите описание');
    const priceNum = Number(price);
    const stockNum = Number(stock);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return alert('Некорректная цена');
    if (!Number.isFinite(stockNum) || stockNum < 0) return alert('Некорректный остаток');
    onSubmit({
      id: initialProduct?.id,
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
      price: priceNum,
      stock: stockNum
    });
  };

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog">
        <div className="modal__header">
          <div className="modal__title">{title}</div>
          <button className="iconBtn" onClick={onClose}>✕</button>
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <label className="label">
            Название
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label className="label">
            Категория
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
          </label>
          <label className="label">
            Описание
            <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="label">
            Цена (₽)
            <input className="input" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
          </label>
          <label className="label">
            Количество на складе
            <input className="input" value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" />
          </label>
          <div className="modal__footer">
            <button type="button" className="btn" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn--primary">
              {mode === 'edit' ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}