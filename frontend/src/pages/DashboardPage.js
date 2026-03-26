import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStats } from '../store/slices/detectionSlice';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ScanLine, Car, CheckCircle, TrendingUp, ArrowRight, Clock, Target, Zap } from 'lucide-react';
import AIInsightsPanel from '../components/AIInsightsPanel';
import styles from './DashboardPage.module.css';

const StatCard = ({ icon: Icon, label, value, sub, color = 'accent' }) => (
  <div className={styles.statCard}>
    <div className={styles.statIcon} style={{ '--c': `var(--${color === 'accent' ? 'accent' : color})` }}>
      <Icon size={20} />
    </div>
    <div className={styles.statInfo}>
      <div className={styles.statValue}>{value ?? '—'}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontSize: 13 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { stats } = useSelector((s) => s.detection);
  const { user } = useSelector((s) => s.auth);

  useEffect(() => { dispatch(fetchStats()); }, [dispatch]);

  const s = stats?.summary || {};
  const daily = stats?.dailyActivity || [];
  const usagePct = stats?.usage && stats?.limits
    ? Math.min(100, Math.round((stats.usage.detectionsThisMonth / stats.limits.detectionsPerMonth) * 100))
    : 0;

  // Fill last 14 days
  const chartData = (() => {
    const map = {};
    daily.forEach(d => { map[d._id] = d; });
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: key.slice(5), detections: map[key]?.detections || 0, plates: map[key]?.plates || 0 };
    });
  })();

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Welcome back, <span className={styles.userName}>{user?.name}</span>
          </p>
        </div>
        <Link to="/detect" className="btn btn-primary">
          <ScanLine size={16} /> New Detection
        </Link>
      </div>

      {/* Stat Cards */}
      <div className={styles.statsGrid}>
        <StatCard icon={ScanLine} label="Total Detections" value={s.total || 0} sub={`${s.completed || 0} completed`} />
        <StatCard icon={Target} label="Plates Detected" value={s.totalPlates || 0} color="accent-blue" />
        <StatCard icon={CheckCircle} label="Success Rate" value={s.total ? `${Math.round((s.completed / s.total) * 100)}%` : '—'} color="success" />
        <StatCard icon={Clock} label="Avg Process Time" value={s.avgProcessingTime ? `${Math.round(s.avgProcessingTime)}ms` : '—'} color="warning" />
      </div>

      {/* Chart + Usage */}
      <div className={styles.midRow}>
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <h3>Detection Activity</h3>
            <span className={styles.cardSubtitle}>Last 14 days</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gDet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPlates" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00b4d8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00b4d8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="detections" name="Detections" stroke="#00ff88" fill="url(#gDet)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="plates" name="Plates" stroke="#00b4d8" fill="url(#gPlates)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.usageCard}>
          <div className={styles.cardHeader}>
            <h3>Monthly Usage</h3>
            <span className={`badge badge-${usagePct > 80 ? 'danger' : 'accent'}`}>{stats?.plan || 'free'}</span>
          </div>
          <div className={styles.usageCircle}>
            <svg viewBox="0 0 120 120" className={styles.usageSvg}>
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--accent)" strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 50 * usagePct / 100} ${2 * Math.PI * 50 * (1 - usagePct / 100)}`}
                strokeLinecap="round" transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
            </svg>
            <div className={styles.usageCenter}>
              <div className={styles.usagePct}>{usagePct}%</div>
              <div className={styles.usageSub}>used</div>
            </div>
          </div>
          <div className={styles.usageNums}>
            <div>
              <Zap size={13} />
              <span>{stats?.usage?.detectionsThisMonth || 0} / {stats?.limits?.detectionsPerMonth || 50}</span>
            </div>
            <span className={styles.usageLabel}>detections this month</span>
          </div>
          {usagePct > 70 && (
            <div className={styles.upgradeHint}>
              <TrendingUp size={13} /> Upgrade for unlimited detections
            </div>
          )}
        </div>
      </div>

      {/* Recent & Top Plates */}
      <div className={styles.bottomRow}>
        <div className={styles.recentCard}>
          <div className={styles.cardHeader}>
            <h3>Recent Detections</h3>
            <Link to="/history" className={styles.seeAll}>See all <ArrowRight size={13} /></Link>
          </div>
          {!stats?.recentDetections?.length ? (
            <div className={styles.emptyState}>
              <ScanLine size={32} opacity={0.3} />
              <p>No detections yet</p>
              <Link to="/detect" className="btn btn-primary" style={{ marginTop: 12 }}>
                Start Detecting
              </Link>
            </div>
          ) : (
            <div className={styles.recentList}>
              {stats.recentDetections.map(d => (
                <Link to={`/history/${d._id}`} key={d._id} className={styles.recentItem}>
                  <div className={`${styles.recentStatus} ${styles[d.status]}`} />
                  <div className={styles.recentInfo}>
                    <span className={styles.recentName}>{d.inputImage?.originalName || 'Unknown'}</span>
                    <span className={styles.recentMeta}>
                      {d.detectionResults?.plates?.[0]?.plateText || 'Processing...'} ·{' '}
                      {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`badge badge-${d.status === 'completed' ? 'success' : d.status === 'failed' ? 'danger' : 'warning'}`}>
                    {d.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className={styles.topPlatesCard}>
          <div className={styles.cardHeader}>
            <h3>Top Plates</h3>
            <Link to="/vehicles" className={styles.seeAll}>View all <ArrowRight size={13} /></Link>
          </div>
          {!stats?.topPlates?.length ? (
            <div className={styles.emptyState}>
              <Car size={32} opacity={0.3} /><p>No plates recorded</p>
            </div>
          ) : (
            <div className={styles.platesList}>
              {stats.topPlates.map((p, i) => (
                <div key={p._id} className={styles.plateItem}>
                  <span className={styles.plateRank}>#{i + 1}</span>
                  <span className={styles.plateNum}>{p._id}</span>
                  <span className={styles.plateCount}>{p.count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Insights Panel */}
        <div className={styles.aiInsightsCard}>
          <AIInsightsPanel />
        </div>
      </div>
    </div>
  );
}
