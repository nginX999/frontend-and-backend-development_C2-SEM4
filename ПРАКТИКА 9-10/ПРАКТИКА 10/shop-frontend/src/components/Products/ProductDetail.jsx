import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import Loading from '../Common/Loading';
import './Products.css';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await api.getProductById(id);
      setProduct(response.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Товар не найден');
      } else {
        setError('Ошибка загрузки товара');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить товар?')) return;
    
    try {
      await api.deleteProduct(id);
      navigate('/products');
    } catch (err) {
      setError('Ошибка удаления товара');
      console.error(err);
    }
  };

  if (loading) return <Loading />;
  if (error) return <div className="error">{error}</div>;
  if (!product) return null;

  return (
    <div className="product-detail">
      <Link to="/products" className="btn btn-secondary">← Назад</Link>
      
      <div className="product-detail-card">
        <h1>{product.title}</h1>
        
        <div className="product-info">
          <div className="info-row">
            <span className="info-label">Категория:</span>
            <span className="info-value">{product.category}</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">Цена:</span>
            <span className="info-value price">{product.price.toLocaleString()} ₽</span>
          </div>
          
          <div className="info-row">
            <span className="info-label">Описание:</span>
            <p className="info-value description">{product.description}</p>
          </div>
        </div>
        
        <div className="product-detail-actions">
          <Link to={`/products/${id}/edit`} className="btn btn-primary">
            Редактировать
          </Link>
          <button onClick={handleDelete} className="btn btn-danger">
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}