import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

// Components
import Header from './components/Layout/Header';
import PrivateRoute from './components/Layout/PrivateRoute';

// Pages
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProductFormPage from './pages/ProductFormPage';
import HomePage from './pages/HomePage';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="App">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/products" /> : <Login />
          } />
          <Route path="/register" element={
            isAuthenticated ? <Navigate to="/products" /> : <Register />
          } />
          <Route path="/products" element={
            <PrivateRoute>
              <ProductsPage />
            </PrivateRoute>
          } />
          <Route path="/products/new" element={
            <PrivateRoute>
              <ProductFormPage />
            </PrivateRoute>
          } />
          <Route path="/products/:id" element={
            <PrivateRoute>
              <ProductDetailPage />
            </PrivateRoute>
          } />
          <Route path="/products/:id/edit" element={
            <PrivateRoute>
              <ProductFormPage />
            </PrivateRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;