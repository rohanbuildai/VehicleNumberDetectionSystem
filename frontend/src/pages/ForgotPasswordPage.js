import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword } from '../store/slices/authSlice';
import { ScanLine, Mail, ArrowRight, CheckCircle } from 'lucide-react';
import styles from './AuthPages.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const dispatch = useDispatch();
  const { loading } = useSelector((s) => s.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await dispatch(forgotPassword(email));
    if (!res.error) setSent(true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGrid} />
      <div className={styles.card}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}><ScanLine size={18} /></div>
          <span>PlateDetect <span className={styles.ai}>AI</span></span>
        </Link>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={48} color="var(--success)" style={{ marginBottom: 16 }} />
            <h2 style={{ marginBottom: 8 }}>Check your email</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              If an account exists for {email}, a password reset link has been sent.
            </p>
            <Link to="/login" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <h1 className={styles.title}>Reset password</h1>
            <p className={styles.subtitle}>Enter your email to receive a reset link</p>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label>Email Address</label>
                <div className={styles.inputWrap}>
                  <Mail size={15} className={styles.inputIcon} />
                  <input type="email" required placeholder="you@example.com"
                    className={styles.input} value={email}
                    onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
                {loading ? <span className={styles.spinner} /> : <><span>Send Reset Link</span><ArrowRight size={16} /></>}
              </button>
            </form>
            <p className={styles.switchText}><Link to="/login">← Back to login</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
