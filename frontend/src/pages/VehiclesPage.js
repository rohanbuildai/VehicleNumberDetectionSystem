import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Car, Search, AlertTriangle, Eye, Calendar, Hash } from 'lucide-react';
import styles from './VehiclesPage.module.css';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/vehicles?page=${page}&limit=15${search ? `&search=${search}` : ''}`);
      setVehicles(data.data);
      setTotal(data.pagination.total);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchVehicles(); }, [page, search]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Vehicles</h1>
          <p className={styles.subtitle}>{total} vehicles tracked</p>
        </div>
      </div>

      <div className={styles.searchWrap}>
        <Search size={14} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Search plate numbers..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div className={styles.loading}>Loading vehicles...</div>
      ) : vehicles.length === 0 ? (
        <div className={styles.empty}>
          <Car size={48} opacity={0.2} />
          <h3>No vehicles tracked yet</h3>
          <p>Vehicles are automatically tracked when plates are detected.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {vehicles.map(v => (
            <div key={v._id} className={`${styles.card} ${v.isFlagged ? styles.flagged : ''}`}>
              <div className={styles.cardHeader}>
                <div className={styles.plateChip}>{v.plateNumber}</div>
                {v.hasActiveAlerts && <AlertTriangle size={16} color="var(--warning)" />}
                {v.isFlagged && <span className="badge badge-danger">Flagged</span>}
              </div>
              <div className={styles.cardBody}>
                {v.make && <div className={styles.meta}><Car size={13} />{v.make} {v.model} {v.year}</div>}
                {v.country && <div className={styles.meta}><Eye size={13} />{v.country}{v.state ? `, ${v.state}` : ''}</div>}
                <div className={styles.meta}><Hash size={13} />Detected {v.seenCount}×</div>
                <div className={styles.meta}><Calendar size={13} />Last seen: {new Date(v.lastSeen || v.firstSeen).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
