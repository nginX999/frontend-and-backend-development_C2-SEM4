import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import ProductCard from './ProductCard';
import Loading from '../Common/Loading';
import './Products.css';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await api.getProducts();
      setProducts(response.data);
      setError(null);
    } catch (err) {
      setError('Ошибка загрузки товаров');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    navigate(`/products/${product.id}/edit`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить товар?')) return;
    
    try {
      await api.deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      setError('Ошибка удаления товара');
      console.error(err);
    }
  };

  if (loading) return <Loading />;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="products-container">
      <div className="products-header">
        <h1>Товары</h1>
        <Link to="/products/new" className="btn btn-primary">
          + Добавить товар
        </Link>
      </div>
      
      {products.length === 0 ? (
        <div className="empty-state">
          <p>Нет товаров</p>
        </div>
      ) : (
        <div className="products-grid">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}