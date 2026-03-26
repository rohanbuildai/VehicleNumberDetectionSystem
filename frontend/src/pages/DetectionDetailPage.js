import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDetection, deleteDetection, toggleFavorite } from '../store/slices/detectionSlice';
import { ArrowLeft, Star, Trash2, Download, CheckCircle, AlertCircle, Clock, Target, Image, Cpu, Map } from 'lucide-react';
import styles from './DetectionDetailPage.module.css';

export default function DetectionDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentDetection: det, loading } = useSelector((s) => s.detection);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const API_BASE = process.env.REACT_APP_API_URL?.replace('/api/v1', '') || '';

  useEffect(() => { dispatch(fetchDetection(id)); }, [dispatch, id]);

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await dispatch(deleteDetection(id));
    navigate('/history');
  };

  if (loading || !det) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading detection...</span>
      </div>
    );
  }

  const q = det.detectionResults?.imageQuality || {};
  const meta = det.detectionResults?.processingMetadata || {};

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Link to="/history" className="btn btn-ghost"><ArrowLeft size={15} /> Back</Link>
        <div className={styles.headerActions}>
          <button
            className={`btn btn-ghost ${det.isFavorite ? styles.favActive : ''}`}
            onClick={() => dispatch(toggleFavorite(det._id))}
          >
            <Star size={15} fill={det.isFavorite ? 'currentColor' : 'none'} />
            {det.isFavorite ? 'Favorited' : 'Favorite'}
          </button>
          <button
            className="btn btn-ghost"
            style={{ color: 'var(--danger)', borderColor: confirmDelete ? 'var(--danger)' : undefined }}
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
          >
            <Trash2 size={15} /> {confirmDelete ? 'Confirm Delete?' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`${styles.statusBanner} ${styles[det.status]}`}>
        {det.status === 'completed'
          ? <CheckCircle size={18} />
          : <AlertCircle size={18} />
        }
        <span className={styles.statusText}>
          {det.status.charAt(0).toUpperCase() + det.status.slice(1)}
        </span>
        <span className={styles.statusDate}>{new Date(det.createdAt).toLocaleString()}</span>
        {det.performance?.processingTimeMs && (
          <span className={styles.statusTime}>
            <Clock size={13} /> {det.performance.processingTimeMs}ms
          </span>
        )}
      </div>

      <div className={styles.mainGrid}>
        {/* Left: Images */}
        <div className={styles.imagesSection}>
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}><Image size={15} /> Original Image</h3>
            {det.inputImage?.url ? (
              <img src={`${API_BASE}${det.inputImage.url}`} alt="Original" className={styles.mainImage} />
            ) : (
              <div className={styles.noImage}>No image available</div>
            )}
            <div className={styles.imageMeta}>
              <span>{det.inputImage?.originalName}</span>
              <span>{det.inputImage?.dimensions?.width}×{det.inputImage?.dimensions?.height}</span>
              <span>{((det.inputImage?.size || 0) / 1024).toFixed(1)}KB</span>
            </div>
          </div>

          {/* Annotated */}
          {det.processedImages?.find(i => i.type === 'annotated') && (
            <div className={styles.sectionCard}>
              <h3 className={styles.sectionTitle}><Target size={15} /> Annotated</h3>
              <img
                src={`${API_BASE}${det.processedImages.find(i => i.type === 'annotated').url}`}
                alt="Annotated"
                className={styles.mainImage}
              />
            </div>
          )}

          {/* All processed */}
          {det.processedImages?.length > 0 && (
            <div className={styles.sectionCard}>
              <h3 className={styles.sectionTitle}><Cpu size={15} /> Processed Versions</h3>
              <div className={styles.processedGrid}>
                {det.processedImages.map((img, i) => (
                  <a key={i} href={`${API_BASE}${img.url}`} target="_blank" rel="noopener noreferrer" className={styles.processedItem}>
                    <img src={`${API_BASE}${img.url}`} alt={img.type} />
                    <span>{img.type?.replace(/_/g, ' ')}</span>
                    <Download size={11} className={styles.downloadIcon} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className={styles.resultsSection}>
          {/* Plates */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}><Target size={15} /> Detected Plates ({det.detectionResults?.platesDetected || 0})</h3>
            {det.detectionResults?.plates?.length > 0 ? (
              <div className={styles.platesList}>
                {det.detectionResults.plates.map((plate, i) => (
                  <div key={i} className={styles.plateCard}>
                    <div className={styles.plateTopRow}>
                      <div className={styles.plateNum}>{plate.plateText}</div>
                      <div className={styles.plateConf}>{Math.round((plate.confidence || 0) * 100)}%</div>
                    </div>
                    <div className={styles.plateTags}>
                      {plate.country && <span className="badge badge-info">{plate.country}</span>}
                      {plate.validationDetails?.state && <span className="badge badge-accent">{plate.validationDetails.state}</span>}
                      {plate.plateType && plate.plateType !== 'unknown' && <span className="badge badge-warning">{plate.plateType}</span>}
                      <span className={`badge badge-${plate.isValid ? 'success' : 'warning'}`}>
                        {plate.isValid ? '✓ Valid' : 'Unverified'}
                      </span>
                    </div>
                    {plate.plateImageUrl && (
                      <img src={`${API_BASE}${plate.plateImageUrl}`} alt="Plate crop" className={styles.plateCropImg} />
                    )}
                    {plate.boundingBox && (
                      <div className={styles.bboxInfo}>
                        <Map size={12} />
                        <span>Bbox: ({plate.boundingBox.x}, {plate.boundingBox.y}) {plate.boundingBox.width}×{plate.boundingBox.height}</span>
                      </div>
                    )}
                    {plate.characters?.length > 0 && (
                      <div className={styles.charBreakdown}>
                        {plate.characters.map((c, ci) => (
                          <div key={ci} className={styles.charCell} title={`${Math.round(c.confidence * 100)}%`}>
                            {c.char}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noPlates}><AlertCircle size={24} opacity={0.4} /><p>No plates detected</p></div>
            )}
          </div>

          {/* Image Quality */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Image Quality Analysis</h3>
            <div className={styles.qualityScore}>
              <div className={styles.qualityScoreCircle}>
                <svg viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border)" strokeWidth="6" />
                  <circle cx="40" cy="40" r="32" fill="none" stroke="var(--accent)" strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 32 * (q.score || 0) / 100} ${2 * Math.PI * 32}`}
                    strokeLinecap="round" transform="rotate(-90 40 40)" />
                </svg>
                <span>{q.score || 0}</span>
              </div>
              <div className={styles.qualityDetails}>
                {Object.entries({ brightness: q.brightness, contrast: q.contrast, sharpness: q.sharpness }).map(([k, v]) => (
                  <div key={k} className={styles.qualityRow}>
                    <span>{k}</span>
                    <div className={styles.qualityBar}><div className={styles.qualityFill} style={{ width: `${v || 0}%` }} /></div>
                    <span className={styles.qualityVal}>{v || 0}</span>
                  </div>
                ))}
              </div>
            </div>
            {q.issues?.length > 0 && (
              <div className={styles.qualityIssues}>
                {q.issues.map(issue => <span key={issue} className="badge badge-warning">{issue}</span>)}
              </div>
            )}
          </div>

          {/* Processing Metadata */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}><Cpu size={15} /> Processing Details</h3>
            <div className={styles.metaList}>
              {meta.ocrEngine && <div className={styles.metaRow}><span>OCR Engine</span><code>{meta.ocrEngine}</code></div>}
              {meta.detectionModel && <div className={styles.metaRow}><span>Model</span><code>{meta.detectionModel}</code></div>}
              {det.performance?.processingTimeMs && <div className={styles.metaRow}><span>Total Time</span><code>{det.performance.processingTimeMs}ms</code></div>}
              {det.performance?.detectionTimeMs && <div className={styles.metaRow}><span>Detection Time</span><code>{det.performance.detectionTimeMs}ms</code></div>}
            </div>
            {meta.algorithmsUsed?.length > 0 && (
              <div className={styles.algos}>
                <span className={styles.algosLabel}>Algorithms used:</span>
                <div className={styles.algoTags}>
                  {meta.algorithmsUsed.map(a => <span key={a} className="badge badge-info">{a.replace(/_/g, ' ')}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
