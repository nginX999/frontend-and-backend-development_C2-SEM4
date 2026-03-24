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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title,
        category: product.category,
        description: product.description,
        price: product.price,
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
      ...formData,
      price: Number(formData.price),
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
      console.error(err);
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
            placeholder="Введите название товара"
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
            rows="4"
            placeholder="Подробное описание товара"
          />
        </div>
        
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