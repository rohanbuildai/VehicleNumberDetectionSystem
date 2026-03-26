import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDetections, deleteDetection, toggleFavorite } from '../store/slices/detectionSlice';
import { Search, Trash2, Star, Eye, ScanLine, Filter, RefreshCw } from 'lucide-react';
import styles from './HistoryPage.module.css';

export default function HistoryPage() {
  const dispatch = useDispatch();
  const { detections, loading, pagination } = useSelector((s) => s.detection);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchDetections({ page, limit: 12, ...(search && { search }), ...(status && { status }) }));
  }, [dispatch, page, search, status]);

  const API_BASE = process.env.REACT_APP_API_URL?.replace('/api/v1', '') || '';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Detection History</h1>
          <p className={styles.subtitle}>{pagination.total} total detections</p>
        </div>
        <button className="btn btn-ghost" onClick={() => dispatch(fetchDetections({ page, limit: 12 }))}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search plate numbers..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className={styles.filterGroup}>
          <Filter size={14} />
          {['', 'completed', 'processing', 'failed'].map(s => (
            <button key={s} className={`${styles.filterBtn} ${status === s ? styles.active : ''}`} onClick={() => { setStatus(s); setPage(1); }}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className={styles.loadingGrid}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : detections.length === 0 ? (
        <div className={styles.empty}>
          <ScanLine size={48} opacity={0.2} />
          <h3>No detections found</h3>
          <p>Start detecting license plates to see your history here.</p>
          <Link to="/detect" className="btn btn-primary" style={{ marginTop: 16 }}>
            <ScanLine size={15} /> Start Detecting
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {detections.map(det => (
              <div key={det._id} className={styles.card}>
                <div className={styles.cardImage}>
                  {det.inputImage?.url
                    ? <img src={`${API_BASE}${det.inputImage.url}`} alt="Detection" />
                    : <div className={styles.noImage}><ScanLine size={24} /></div>
                  }
                  <div className={styles.cardStatus}>
                    <span className={`badge badge-${det.status === 'completed' ? 'success' : det.status === 'failed' ? 'danger' : 'warning'}`}>
                      {det.status}
                    </span>
                  </div>
                  <button
                    className={`${styles.favBtn} ${det.isFavorite ? styles.favActive : ''}`}
                    onClick={() => dispatch(toggleFavorite(det._id))}
                  >
                    <Star size={13} fill={det.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardPlate}>
                    {det.detectionResults?.plates?.[0]?.plateText || '—'}
                  </div>
                  <div className={styles.cardMeta}>
                    <span>{det.inputImage?.originalName?.slice(0, 20) || 'Unknown'}</span>
                    <span>{new Date(det.createdAt).toLocaleDateString()}</span>
                  </div>
                  {det.detectionResults?.platesDetected > 0 && (
                    <div className={styles.cardPlateCount}>
                      {det.detectionResults.platesDetected} plate{det.detectionResults.platesDetected !== 1 ? 's' : ''} detected
                    </div>
                  )}
                </div>
                <div className={styles.cardActions}>
                  <Link to={`/history/${det._id}`} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '7px' }}>
                    <Eye size={13} /> View
                  </Link>
                  <button className="btn btn-ghost" style={{ padding: '7px 10px', color: 'var(--danger)', borderColor: 'transparent' }}
                    onClick={() => dispatch(deleteDetection(det._id))}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className={styles.pagination}>
              <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className={styles.pageInfo}>Page {page} of {pagination.pages}</span>
              <button className="btn btn-ghost" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
