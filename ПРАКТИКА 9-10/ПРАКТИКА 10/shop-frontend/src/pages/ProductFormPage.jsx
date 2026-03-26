import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProductForm from '../components/Products/ProductForm';
import { api } from '../api';
import Loading from '../components/Common/Loading';

export default function ProductFormPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await api.getProductById(id);
      setProduct(response.data);
      console.log('Загружен товар для редактирования:', response.data);
    } catch (err) {
      console.error('Ошибка загрузки товара:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return <ProductForm product={product} isEdit={isEdit} />;
}