import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '../store/slices/authSlice';
import { ScanLine, Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import styles from './AuthPages.module.css';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);

  const passwordStrength = () => {
    const p = form.password;
    if (p.length === 0) return null;
    if (p.length < 6) return 'weak';
    if (p.length < 10) return 'medium';
    return 'strong';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await dispatch(register(form));
    if (!res.error) navigate('/dashboard');
  };

  const strength = passwordStrength();

  return (
    <div className={styles.page}>
      <div className={styles.bgGrid} />
      <div className={styles.card}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}><ScanLine size={18} /></div>
          <span>PlateDetect <span className={styles.ai}>AI</span></span>
        </Link>

        <h1 className={styles.title}>Create account</h1>
        <p className={styles.subtitle}>Start detecting plates for free</p>

        {error && (
          <div className={styles.errorBanner}><AlertCircle size={15} /> {error}</div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Full Name</label>
            <div className={styles.inputWrap}>
              <User size={15} className={styles.inputIcon} />
              <input type="text" placeholder="John Doe" required className={styles.input}
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>

          <div className={styles.field}>
            <label>Email Address</label>
            <div className={styles.inputWrap}>
              <Mail size={15} className={styles.inputIcon} />
              <input type="email" placeholder="you@example.com" required className={styles.input}
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>

          <div className={styles.field}>
            <label>Password</label>
            <div className={styles.inputWrap}>
              <Lock size={15} className={styles.inputIcon} />
              <input type={showPass ? 'text' : 'password'} placeholder="Min 8 characters" required className={styles.input}
                minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {strength && (
              <div className={styles.strengthBar}>
                <div className={`${styles.strengthFill} ${styles[strength]}`} />
                <span className={styles[strength]}>{strength}</span>
              </div>
            )}
          </div>

          <div className={styles.perks}>
            {['50 free detections/month', 'Real-time processing', 'API access included'].map(perk => (
              <div key={perk} className={styles.perk}><CheckCircle size={13} /> {perk}</div>
            ))}
          </div>

          <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : <><span>Create Account</span><ArrowRight size={16} /></>}
          </button>
        </form>

        <p className={styles.switchText}>
          Already have an account? <Link to="/login">Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
