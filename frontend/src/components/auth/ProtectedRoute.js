import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = () => {
  const { isAuthenticated } = useSelector((s) => s.auth);
  const token = localStorage.getItem('token');
  return (isAuthenticated || token) ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
