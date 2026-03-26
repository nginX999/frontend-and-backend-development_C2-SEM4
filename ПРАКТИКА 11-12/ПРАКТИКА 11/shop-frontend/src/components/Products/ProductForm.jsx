import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import './Products.css';

export default function ProductForm({ product, isEdit }) {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    price: '',
    stock: '',
    image: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || '',
        category: product.category || '',
        description: product.description || '',
        price: product.price || '',
        stock: product.stock || '',
        image: product.image || ''
      });
    }
  }, [product]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const productData = {
      title: formData.title,
      category: formData.category,
      description: formData.description,
      price: Number(formData.price),
      stock: Number(formData.stock),
      image: formData.image || "https://via.placeholder.com/300x200?text=Товар"
    };
    
    try {
      if (isEdit && product) {
        await api.updateProduct(product.id, productData);
      } else {
        await api.createProduct(productData);
      }
      navigate('/products');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения товара');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-form-container">
      <h1>{isEdit ? 'Редактировать товар' : 'Новый товар'}</h1>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label>Название *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Например: Ноутбук Lenovo"
          />
        </div>
        
        <div className="form-group">
          <label>Категория *</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            placeholder="Например: Электроника"
          />
        </div>
        
        <div className="form-group">
          <label>Описание *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="3"
            placeholder="Подробное описание товара"
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Цена (₽) *</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              min="0"
              step="1"
              placeholder="0"
            />
          </div>
          
          <div className="form-group">
            <label>Количество на складе *</label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              required
              min="0"
              step="1"
              placeholder="0"
            />
          </div>
        </div>
        
        {/* ПОЛЕ ДЛЯ URL ИЗОБРАЖЕНИЯ */}
        <div className="form-group">
          <label>URL изображения</label>
          <input
            type="text"
            name="image"
            value={formData.image}
            onChange={handleChange}
            placeholder="https://example.com/image.jpg"
          />
          <small>Оставьте пустым для изображения по умолчанию</small>
        </div>
        
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/products')} className="btn btn-secondary">
            Отмена
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Сохранение...' : (isEdit ? 'Сохранить' : 'Создать')}
          </button>
        </div>
      </form>
    </div>
  );
}