import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../store/slices/authSlice';
import { ScanLine, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import styles from './AuthPages.module.css';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await dispatch(login(form));
    if (!res.error) navigate('/dashboard');
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGrid} />
      <div className={styles.card}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}><ScanLine size={18} /></div>
          <span>PlateDetect <span className={styles.ai}>AI</span></span>
        </Link>

        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

        {error && (
          <div className={styles.errorBanner}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Email Address</label>
            <div className={styles.inputWrap}>
              <Mail size={15} className={styles.inputIcon} />
              <input
                type="email" placeholder="you@example.com" required
                className={styles.input}
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>Password</label>
            <div className={styles.inputWrap}>
              <Lock size={15} className={styles.inputIcon} />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Your password" required
                className={styles.input}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <div className={styles.forgotWrap}>
              <Link to="/forgot-password" className={styles.forgot}>Forgot password?</Link>
            </div>
          </div>

          <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : <><span>Sign In</span><ArrowRight size={16} /></>}
          </button>
        </form>

        <p className={styles.switchText}>
          Don't have an account? <Link to="/register">Create one →</Link>
        </p>
      </div>
    </div>
  );
}
