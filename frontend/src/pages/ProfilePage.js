import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateUser } from '../store/slices/authSlice';
import api from '../services/api';
import toast from 'react-hot-toast';
import { User, Key, Shield, Bell, Copy, RefreshCw, Save } from 'lucide-react';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const [name, setName] = useState(user?.name || '');
  const [apiKey, setApiKey] = useState(user?.apiKey || '');
  const [saving, setSaving] = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/users/profile', { name });
      dispatch(updateUser(data.data));
      toast.success('Profile updated!');
    } catch (e) { toast.error('Failed to update profile'); }
    setSaving(false);
  };

  const handleGenerateKey = async () => {
    setGenLoading(true);
    try {
      const { data } = await api.post('/auth/generate-api-key');
      setApiKey(data.apiKey);
      dispatch(updateUser({ apiKey: data.apiKey }));
      toast.success('New API key generated!');
    } catch (e) { toast.error('Failed to generate key'); }
    setGenLoading(false);
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast.success('API key copied!');
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Profile & Settings</h1>

      <div className={styles.grid}>
        {/* Profile */}
        <div className={styles.card}>
          <div className={styles.cardHeader}><User size={16} /><h3>Profile Information</h3></div>
          <div className={styles.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
          <div className={styles.field}>
            <label>Full Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className={styles.field}>
            <label>Email</label>
            <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
          </div>
          <div className={styles.field}>
            <label>Plan</label>
            <div className={styles.planRow}>
              <span className="badge badge-accent">{user?.plan || 'free'}</span>
              <span className={styles.planSub}>{user?.usage?.detectionsThisMonth || 0} / {user?.limits?.detectionsPerMonth || 50} detections this month</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ marginTop: 8 }}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* API Key */}
        <div className={styles.card}>
          <div className={styles.cardHeader}><Key size={16} /><h3>API Key</h3></div>
          <p className={styles.cardDesc}>Use this key to access the PlateDetect API from your applications.</p>
          <div className={styles.apiKeyWrap}>
            <code className={styles.apiKey}>{apiKey ? `${apiKey.slice(0, 24)}...` : 'No API key generated'}</code>
            <div className={styles.apiKeyActions}>
              <button className="btn btn-ghost" onClick={copyApiKey} disabled={!apiKey} title="Copy key">
                <Copy size={13} />
              </button>
              <button className="btn btn-ghost" onClick={handleGenerateKey} disabled={genLoading} title="Regenerate key">
                <RefreshCw size={13} className={genLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          <div className={styles.apiInfo}>
            <div className={styles.apiInfoRow}><strong>Header:</strong><code>x-api-key: YOUR_API_KEY</code></div>
            <div className={styles.apiInfoRow}><strong>Base URL:</strong><code>/api/v1</code></div>
          </div>
        </div>

        {/* Security */}
        <div className={styles.card}>
          <div className={styles.cardHeader}><Shield size={16} /><h3>Security</h3></div>
          <div className={styles.securityList}>
            <div className={styles.securityItem}>
              <div>
                <strong>Email Verified</strong>
                <span>{user?.isEmailVerified ? 'Your email is verified' : 'Email not verified'}</span>
              </div>
              <span className={`badge badge-${user?.isEmailVerified ? 'success' : 'warning'}`}>
                {user?.isEmailVerified ? 'Verified' : 'Pending'}
              </span>
            </div>
            <div className={styles.securityItem}>
              <div>
                <strong>Account Status</strong>
                <span>Your account is {user?.isActive ? 'active' : 'inactive'}</span>
              </div>
              <span className={`badge badge-${user?.isActive ? 'success' : 'danger'}`}>
                {user?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className={styles.securityItem}>
              <div>
                <strong>Member Since</strong>
                <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className={styles.card}>
          <div className={styles.cardHeader}><Bell size={16} /><h3>Usage Statistics</h3></div>
          <div className={styles.usageList}>
            {[
              { label: 'Total Detections', val: user?.usage?.totalDetections || 0 },
              { label: 'This Month', val: user?.usage?.detectionsThisMonth || 0 },
              { label: 'Monthly Limit', val: user?.limits?.detectionsPerMonth || 50 },
              { label: 'Storage Used', val: `${((user?.usage?.storageUsed || 0) / 1024 / 1024).toFixed(1)} MB` },
            ].map(({ label, val }) => (
              <div key={label} className={styles.usageRow}>
                <span>{label}</span>
                <strong className={styles.usageVal}>{val}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
