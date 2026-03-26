import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getMe } from './store/slices/authSlice';
import { initSocket } from './services/socket';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import DetectionPage from './pages/DetectionPage';
import AIDetectionPage from './pages/AIDetectionPage';
import HistoryPage from './pages/HistoryPage';
import VehiclesPage from './pages/VehiclesPage';
import ProfilePage from './pages/ProfilePage';
import DetectionDetailPage from './pages/DetectionDetailPage';
import VehicleResultPage from './pages/VehicleResultPage';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((s) => s.auth);

  useEffect(() => {
    if (localStorage.getItem('token')) dispatch(getMe());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && user?._id) {
      initSocket(user._id);
    }
  }, [isAuthenticated, user]);

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/detect" element={<AIDetectionPage />} />
          <Route path="/detect-standard" element={<DetectionPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:id" element={<DetectionDetailPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/vehicle-result" element={<VehicleResultPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
