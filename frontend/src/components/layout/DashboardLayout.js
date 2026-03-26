import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import {
  LayoutDashboard, ScanLine, History, Car, User,
  LogOut, Menu, X, Activity, ChevronRight, Bell, Zap
} from 'lucide-react';
import styles from './DashboardLayout.module.css';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/detect', icon: ScanLine, label: 'Detect' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/vehicles', icon: Car, label: 'Vehicles' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.collapsed}`}>
        <div className={styles.sidebarHeader}>
          {sidebarOpen && (
            <div className={styles.logo}>
              <div className={styles.logoIcon}><ScanLine size={18} /></div>
              <div>
                <span className={styles.logoText}>PlateDetect</span>
                <span className={styles.logoAi}>AI</span>
              </div>
            </div>
          )}
          <button className={styles.menuToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} />
              {sidebarOpen && <span>{label}</span>}
              {sidebarOpen && <ChevronRight size={14} className={styles.chevron} />}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {sidebarOpen && user && (
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userPlan}>{user.plan || 'free'} plan</span>
              </div>
            </div>
          )}
          <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
            <LogOut size={16} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.main}>
        {/* Top bar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <div className={styles.statusDot} />
            <span className={styles.statusText}>System Online</span>
            <Activity size={14} className={styles.statusIcon} />
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.usageChip}>
              <Zap size={12} />
              <span>{user?.usage?.detectionsThisMonth || 0} / {user?.limits?.detectionsPerMonth || 50}</span>
            </div>
            <button className={styles.notifBtn}><Bell size={16} /></button>
            <div className={styles.topbarAvatar}>{user?.name?.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
