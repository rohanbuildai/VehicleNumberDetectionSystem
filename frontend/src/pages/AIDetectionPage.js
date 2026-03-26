/**
 * AIDetectionPage - Enhanced Detection with AI Agents
 * Integrates SmartUpload for AI-powered image analysis and processing
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import {
  submitDetection, setJobProgress, setJobResult,
  clearActiveJob, pollJobStatus,
} from '../store/slices/detectionSlice';
import { initSocket } from '../services/socket';
import SmartUpload from '../components/SmartUpload';
import VehicleDetailsPanel from '../components/VehicleDetailsPanel';
import { Upload, ScanLine, X, CheckCircle, AlertCircle, Loader, Image, Zap, Brain, Sparkles } from 'lucide-react';
import styles from './DetectionPage.module.css';

const POLL_INTERVAL_MS  = 2500;
const SOCKET_TIMEOUT_MS = 4000;

const processingStages = [
  { key: 'pending',    label: 'Queued',                    pct: 5  },
  { key: 'analyzing',  label: 'Analyzing image quality',   pct: 15 },
  { key: 'enhancing',  label: 'Enhancing & preprocessing', pct: 35 },
  { key: 'detecting',  label: 'Detecting plate regions',   pct: 55 },
  { key: 'annotating', label: 'Annotating & cropping',     pct: 70 },
  { key: 'fetching_vehicle_data', label: 'Fetching vehicle details', pct: 85 },
  { key: 'saving',     label: 'Saving results',            pct: 95 },
  { key: 'completed',  label: 'Detection complete!',       pct: 100},
];

const defaultOptions = {
  enhanceContrast:      true,
  denoising:            true,
  sharpening:           true,
  grayscaleConversion:  true,
  morphologicalOps:     true,
  outputAnnotated:      true,
  outputCroppedPlates:  true,
};

export default function AIDetectionPage() {
  const dispatch   = useDispatch();
  const { submitting, activeJob, jobStatus, jobProgress, currentDetection } =
    useSelector((s) => s.detection);
  const { user } = useSelector((s) => s.auth);

  const [preview,     setPreview]     = useState(null);
  const [file,        setFile]        = useState(null);
  const [options,     setOptions]     = useState(defaultOptions);
  const [showOptions, setShowOptions] = useState(false);
  const [result,      setResult]      = useState(null);
  const [useAIMode,   setUseAIMode]    = useState(true); // AI mode enabled by default

  const previewUrl   = useRef(null);
  const pollTimer    = useRef(null);
  const socketReady  = useRef(false);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);

  // HTTP polling fallback
  const startPolling = useCallback((jobId) => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      const action = await dispatch(pollJobStatus(jobId));
      if (pollJobStatus.fulfilled.match(action)) {
        const det = action.payload;
        if (det?.status === 'completed') {
          setResult(det);
          clearInterval(pollTimer.current);
          pollTimer.current = null;
        } else if (det?.status === 'failed') {
          clearInterval(pollTimer.current);
          pollTimer.current = null;
        }
      }
    }, POLL_INTERVAL_MS);
  }, [dispatch]);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  // Socket subscription
  useEffect(() => {
    if (!activeJob) return;
    const { jobId } = activeJob;

    const sock = initSocket(user?._id);
    socketReady.current = false;

    const socketTimeout = setTimeout(() => {
      if (!socketReady.current) {
        console.warn('Socket not ready — relying on HTTP polling');
      }
    }, SOCKET_TIMEOUT_MS);

    const onProgress = (data) => {
      if (data.jobId !== jobId) return;
      socketReady.current = true;
      dispatch(setJobProgress({ stage: data.stage, progress: data.progress }));
    };

    const onResult = (data) => {
      if (data.jobId !== jobId) return;
      socketReady.current = true;
      stopPolling();
      dispatch(setJobResult(data));
      if (data.status === 'completed' && data.data) {
        setResult(data.data);
      }
    };

    if (sock) {
      sock.on('detection:progress', onProgress);
      sock.on('detection:result',   onResult);
    }

    startPolling(jobId);

    return () => {
      clearTimeout(socketTimeout);
      if (sock) {
        sock.off('detection:progress', onProgress);
        sock.off('detection:result',   onResult);
      }
    };
  }, [activeJob, dispatch, startPolling, stopPolling, user]);

  // Also use currentDetection from Redux (updated by polling)
  useEffect(() => {
    if (currentDetection && currentDetection.detectionResults) {
      setResult(currentDetection);
    }
  }, [currentDetection]);

  // Dropzone
  const onDrop = useCallback((accepted) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    dispatch(clearActiveJob());
    stopPolling();
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = URL.createObjectURL(f);
    setPreview(previewUrl.current);
  }, [dispatch, stopPolling]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif', '.bmp'] },
    maxSize: 10 * 1024 * 1024,
  });

  const handleDetect = async () => {
    if (!file) return;
    setResult(null);
    const fd = new FormData();
    fd.append('image', file);
    Object.entries(options).forEach(([k, v]) => fd.append(k, v));
    dispatch(submitDetection(fd));
  };

  // Handle AI processing result
  const handleAIProcessComplete = (aiResult) => {
    if (aiResult?.result) {
      setResult({
        detectionResults: {
          plates: aiResult.result.text ? [{
            plateText: aiResult.result.text,
            confidence: aiResult.result.confidence,
            country: aiResult.result.region,
            isValid: true
          }] : []
        },
        analysis: aiResult.analysis,
        anomalies: aiResult.anomalies,
        performance: {
          processingTimeMs: aiResult.processing?.processingTime
        }
      });
    }
  };

  const resetAll = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    stopPolling();
    dispatch(clearActiveJob());
  };

  const isProcessing = submitting ||
    (jobStatus && jobStatus !== 'completed' && jobStatus !== 'failed');

  const API_BASE = process.env.REACT_APP_API_URL?.replace('/api/v1', '') || '';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {useAIMode ? <><Brain size={24} /> AI Detection</> : 'Detect License Plate'}
          </h1>
          <p className={styles.subtitle}>
            {useAIMode 
              ? 'Advanced AI-powered detection with real-time analysis and optimization'
              : 'Upload an image to detect and extract vehicle number plates'}
          </p>
        </div>
        <div className={styles.modeToggle}>
          <button 
            className={`${styles.modeBtn} ${useAIMode ? styles.active : ''}`}
            onClick={() => setUseAIMode(true)}
          >
            <Sparkles size={15} /> AI Mode
          </button>
          <button 
            className={`${styles.modeBtn} ${!useAIMode ? styles.active : ''}`}
            onClick={() => setUseAIMode(false)}
          >
            <ScanLine size={15} /> Standard
          </button>
          <button 
            className="btn btn-ghost"
            onClick={() => setShowOptions(!showOptions)}
            style={{ marginLeft: '8px' }}
          >
            <Zap size={15} /> Options
          </button>
        </div>
      </div>

      {/* Options Panel - Only for standard mode */}
      {showOptions && !useAIMode && (
        <div className={styles.optionsPanel}>
          <h3 className={styles.optionsTitle}><Zap size={15} /> Processing Options</h3>
          <div className={styles.optionsGrid}>
            {Object.entries(options).map(([key, val]) => (
              <label key={key} className={styles.optionToggle}>
                <input type="checkbox" checked={val}
                  onChange={e => setOptions(prev => ({ ...prev, [key]: e.target.checked }))} />
                <div className={styles.optionContent}>
                  <span className={styles.optionLabel}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* AI Mode - Smart Upload */}
      {useAIMode && (
        <div className={styles.aiContainer}>
          <SmartUpload 
            onProcessComplete={handleAIProcessComplete}
            processingStrategy="balanced"
          />
        </div>
      )}

      {/* Standard Mode - Original UI */}
      {!useAIMode && (
        <div className={styles.mainGrid}>
          {/* Upload / Preview */}
          <div className={styles.uploadSection}>
            {!preview ? (
              <div
                {...getRootProps()}
                className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}
              >
                <input {...getInputProps()} />
                <Upload size={36} />
                <h3>Drop your image here</h3>
                <p>or click to select</p>
                <span className={styles.hint}>
                  Supports JPEG, PNG, WebP, GIF, BMP (max 10MB)
                </span>
              </div>
            ) : (
              <div className={styles.previewContainer}>
                <img src={preview} alt="Preview" className={styles.previewImg} />
                <button className={styles.clearBtn} onClick={resetAll}>
                  <X size={16} />
                </button>
                <div className={styles.previewMeta}>
                  <Image size={14} />
                  <span>{file?.name}</span>
                </div>
              </div>
            )}

            {preview && (
              <button
                className={`btn btn-primary ${styles.detectBtn}`}
                onClick={handleDetect}
                disabled={isProcessing}
              >
                {isProcessing
                  ? <><Loader size={16} className="animate-spin" /> Processing…</>
                  : <><ScanLine size={16} /> Detect Plate</>}
              </button>
            )}
          </div>

          {/* Results / Progress */}
          <div className={styles.resultsSection}>
            {isProcessing && (
              <div className={styles.progressCard}>
                <div className={styles.progressHeader}>
                  <Loader size={16} className="animate-spin"
                    style={{ color: 'var(--accent)' }} />
                  <span>
                    {processingStages.find(s => s.key === jobStatus)?.label
                      || 'Processing…'}
                  </span>
                </div>

                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${jobProgress}%` }}
                  />
                </div>
                <div className={styles.progressPct}>{jobProgress}%</div>

                <div className={styles.stageList}>
                  {processingStages.filter(s => s.key !== 'pending').map((stage, i) => {
                    const stageIdx = processingStages.findIndex(s => s.key === jobStatus);
                    const myIdx    = processingStages.findIndex(s => s.key === stage.key);
                    const done     = myIdx < stageIdx;
                    const current  = myIdx === stageIdx;
                    return (
                      <div
                        key={stage.key}
                        className={`${styles.stage}
                          ${done    ? styles.stageDone    : ''}
                          ${current ? styles.stageCurrent : ''}`}
                      >
                        <div className={styles.stageDot} />
                        <span>{stage.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {result && (
              <div className={styles.results}>
                <div className={styles.resultHeader}>
                  <CheckCircle size={18} color="var(--success)" />
                  <h3>Detection Complete</h3>
                  <span className={styles.processingTime}>
                    {result.performance?.processingTimeMs
                      ? `${result.performance.processingTimeMs} ms`
                      : ''}
                  </span>
                </div>

                {result.detectionResults?.plates?.length > 0 ? (
                  <div className={styles.platesFound}>
                    {result.detectionResults.plates.map((plate, i) => (
                      <div key={i} className={styles.plateResult}>
                        <div className={styles.plateResultHeader}>
                          <div className={styles.plateResultNum}>
                            {plate.plateText}
                          </div>
                          <span className={styles.plateConf}>
                            {Math.round((plate.confidence || 0) * 100)}%
                          </span>
                        </div>
                        <div className={styles.plateResultMeta}>
                          {plate.country && (
                            <span className="badge badge-info">{plate.country}</span>
                          )}
                          {plate.validationDetails?.state && (
                            <span className="badge badge-accent">
                              {plate.validationDetails.state}
                            </span>
                          )}
                          <span className={`badge badge-${plate.isValid ? 'success' : 'warning'}`}>
                            {plate.isValid ? 'Valid' : 'Unverified'}
                          </span>
                        </div>
                        {plate.plateImageUrl && (
                          <img
                            src={`${API_BASE}${plate.plateImageUrl}`}
                            alt="Plate crop"
                            className={styles.plateCrop}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noPlate}>
                    <AlertCircle size={24} opacity={0.4} />
                    <p>No plates detected</p>
                    <span>Try a clearer image or adjust processing options</span>
                  </div>
                )}

                {/* Vehicle Details from Government Database */}
                <VehicleDetailsPanel 
                  vehicleDetails={result.detectionResults?.vehicleDetails} 
                />

                {/* Image quality */}
                {result.detectionResults?.imageQuality && (
                  <div className={styles.qualityCard}>
                    <h4>Image Quality</h4>
                    <div className={styles.qualityGrid}>
                      {['brightness', 'contrast', 'sharpness'].map(m => (
                        <div key={m} className={styles.qualityMetric}>
                          <span>{m}</span>
                          <div className={styles.qualityBar}>
                            <div
                              className={styles.qualityFill}
                              style={{
                                width: `${result.detectionResults.imageQuality[m] || 0}%`,
                              }}
                            />
                          </div>
                          <span className={styles.qualityVal}>
                            {result.detectionResults.imageQuality[m] || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className={styles.qualityScore}>
                      Score:{' '}
                      <strong>
                        {result.detectionResults.imageQuality.score}/100
                      </strong>
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                  onClick={resetAll}
                >
                  Detect Another Image
                </button>
              </div>
            )}

            {!isProcessing && !result && (
              <div className={styles.idleState}>
                <div className={styles.idleIcon}><ScanLine size={36} /></div>
                <h3>Ready to Detect</h3>
                <p>
                  Upload an image to start plate detection. Our AI will process
                  and extract vehicle number plates instantly.
                </p>
                <div className={styles.idleStats}>
                  <div><strong>50+</strong><span>Countries</span></div>
                  <div><strong>99.2%</strong><span>Accuracy</span></div>
                  <div><strong>&lt;1 s</strong><span>Processing</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}