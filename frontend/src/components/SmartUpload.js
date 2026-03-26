/**
 * SmartUpload Component
 * AI-powered image upload with real-time analysis and recommendations
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle, Zap, Brain, Loader } from 'lucide-react';
import { analyzeImage, detectAnomalies, smartProcess } from '../services/aiService';
import styles from './SmartUpload.module.css';

const ANALYSIS_STATUS = {
  idle: 'idle',
  analyzing: 'analyzing',
  ready: 'ready',
  error: 'error'
};

export default function SmartUpload({ onProcessComplete, processingStrategy = 'balanced' }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState(ANALYSIS_STATUS.idle);
  const [analysis, setAnalysis] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback(async (selectedFile) => {
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload JPEG, PNG, WebP, GIF, or BMP.');
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setAnalysis(null);
    setAnomalies(null);
    setRecommendations([]);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(selectedFile);

    // Start AI analysis
    setStatus(ANALYSIS_STATUS.analyzing);
    await analyzeImageFile(selectedFile);
  }, []);

  const analyzeImageFile = async (fileToAnalyze) => {
    try {
      const formData = new FormData();
      formData.append('image', fileToAnalyze);

      // Run analysis and anomaly detection in parallel
      const [analysisResult, anomalyResult] = await Promise.all([
        analyzeImage(formData),
        detectAnomalies(formData)
      ]);

      setAnalysis(analysisResult.data);
      setAnomalies(anomalyResult.data);

      // Generate recommendations based on analysis
      const recs = generateRecommendations(analysisResult.data, anomalyResult.data);
      setRecommendations(recs);

      setStatus(ANALYSIS_STATUS.ready);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze image. Using standard processing.');
      setStatus(ANALYSIS_STATUS.ready);
    }
  };

  const generateRecommendations = (analysisData, anomalyData) => {
    const recs = [];

    // Based on image analysis
    if (analysisData?.quality < 50) {
      recs.push({ type: 'quality', message: 'Low image quality detected - AI will enhance', icon: 'zap' });
    }
    if (analysisData?.brightness < 80) {
      recs.push({ type: 'brightness', message: 'Image is dark - AI will adjust brightness', icon: 'zap' });
    }
    if (analysisData?.brightness > 200) {
      recs.push({ type: 'brightness', message: 'Image is too bright - AI will reduce exposure', icon: 'zap' });
    }
    if (analysisData?.noiseLevel > 40) {
      recs.push({ type: 'noise', message: 'High noise detected - AI will reduce noise', icon: 'zap' });
    }
    if (analysisData?.sharpness < 40) {
      recs.push({ type: 'sharpness', message: 'Image may be blurry - AI will sharpen', icon: 'zap' });
    }

    // Based on anomaly detection
    if (anomalyData?.riskLevel === 'high') {
      recs.push({ type: 'risk', message: 'High-risk anomalies detected - extra processing applied', icon: 'alert' });
    }
    if (anomalyData?.anomalies?.some(a => a.type === 'exposure')) {
      recs.push({ type: 'exposure', message: 'Exposure issues detected - AI will compensate', icon: 'zap' });
    }

    if (recs.length === 0) {
      recs.push({ type: 'optimal', message: 'Image looks good - standard processing', icon: 'check' });
    }

    return recs;
  };

  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('strategy', processingStrategy);

      setProgress(30);
      const result = await smartProcess(formData);

      setProgress(90);

      if (onProcessComplete) {
        onProcessComplete({
          ...result.data,
          originalFile: file,
          preview
        });
      }

      setProgress(100);
    } catch (err) {
      setError(err.response?.data?.message || 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setStatus(ANALYSIS_STATUS.idle);
    setAnalysis(null);
    setAnomalies(null);
    setRecommendations([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getQualityColor = (quality) => {
    if (quality >= 70) return 'var(--success)';
    if (quality >= 40) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'critical': return 'var(--danger)';
      case 'high': return 'var(--warning)';
      case 'medium': return 'var(--accent)';
      default: return 'var(--success)';
    }
  };

  return (
    <div className={styles.smartUpload}>
      {/* Drop Zone */}
      {!file && (
        <div
          className={styles.dropZone}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <Upload size={40} className={styles.uploadIcon} />
          <h3>Drop your image here</h3>
          <p>or click to browse</p>
          <span className={styles.hint}>Supports JPEG, PNG, WebP, GIF, BMP (max 10MB)</span>
        </div>
      )}

      {/* Preview & Analysis */}
      {file && preview && (
        <div className={styles.previewContainer}>
          <div className={styles.previewSection}>
            <div className={styles.previewWrapper}>
              <img src={preview} alt="Preview" className={styles.preview} />
              
              {processing && (
                <div className={styles.processingOverlay}>
                  <Loader className={styles.spinner} size={32} />
                  <span>AI Processing...</span>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <button className={styles.resetBtn} onClick={reset} disabled={processing}>
                ×
              </button>
            </div>
          </div>

          {/* Analysis Results */}
          <div className={styles.analysisSection}>
            <div className={styles.analysisHeader}>
              <Brain size={20} />
              <span>AI Analysis</span>
              {status === ANALYSIS_STATUS.analyzing && <Loader className={styles.smallSpinner} size={16} />}
            </div>

            {error && (
              <div className={styles.errorBox}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Quality Metrics */}
            {analysis && (
              <div className={styles.metricsGrid}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Quality</span>
                  <div className={styles.metricBar}>
                    <div
                      className={styles.metricFill}
                      style={{
                        width: `${analysis.quality}%`,
                        backgroundColor: getQualityColor(analysis.quality)
                      }}
                    />
                  </div>
                  <span className={styles.metricValue}>{analysis.quality}%</span>
                </div>

                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Brightness</span>
                  <div className={styles.metricBar}>
                    <div
                      className={styles.metricFill}
                      style={{
                        width: `${Math.min(100, analysis.brightness / 2.55)}%`,
                        backgroundColor: analysis.brightness < 80 || analysis.brightness > 200 ? 'var(--warning)' : 'var(--success)'
                      }}
                    />
                  </div>
                  <span className={styles.metricValue}>{analysis.brightness}</span>
                </div>

                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Contrast</span>
                  <div className={styles.metricBar}>
                    <div
                      className={styles.metricFill}
                      style={{ width: `${Math.min(100, analysis.contrast / 2.55)}%` }}
                    />
                  </div>
                  <span className={styles.metricValue}>{analysis.contrast}</span>
                </div>

                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Sharpness</span>
                  <div className={styles.metricBar}>
                    <div
                      className={styles.metricFill}
                      style={{
                        width: `${analysis.sharpness}%`,
                        backgroundColor: analysis.sharpness < 40 ? 'var(--warning)' : 'var(--success)'
                      }}
                    />
                  </div>
                  <span className={styles.metricValue}>{analysis.sharpness}%</span>
                </div>

                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Noise</span>
                  <div className={styles.metricBar}>
                    <div
                      className={styles.metricFill}
                      style={{
                        width: `${analysis.noiseLevel}%`,
                        backgroundColor: analysis.noiseLevel > 40 ? 'var(--warning)' : 'var(--success)'
                      }}
                    />
                  </div>
                  <span className={styles.metricValue}>{analysis.noiseLevel}%</span>
                </div>

                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Confidence</span>
                  <div className={styles.metricBar}>
                    <div
                      className={styles.metricFill}
                      style={{
                        width: `${analysis.confidence}%`,
                        backgroundColor: analysis.confidence > 60 ? 'var(--success)' : 'var(--warning)'
                      }}
                    />
                  </div>
                  <span className={styles.metricValue}>{analysis.confidence}%</span>
                </div>
              </div>
            )}

            {/* Risk Assessment */}
            {anomalies && (
              <div className={styles.riskSection}>
                <div className={styles.riskHeader}>
                  <span>Risk Assessment</span>
                  <span
                    className={styles.riskBadge}
                    style={{ color: getRiskColor(anomalies.riskLevel) }}
                  >
                    {anomalies.riskLevel?.toUpperCase()}
                  </span>
                </div>
                {anomalies.anomalies?.length > 0 && (
                  <ul className={styles.anomalyList}>
                    {anomalies.anomalies.slice(0, 3).map((a, i) => (
                      <li key={i} className={styles.anomalyItem}>
                        <AlertCircle size={14} style={{ color: getRiskColor(a.severity) }} />
                        {a.message || a.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* AI Recommendations */}
            <div className={styles.recommendations}>
              <div className={styles.recHeader}>
                <Zap size={16} />
                AI Recommendations
              </div>
              <ul className={styles.recList}>
                {recommendations.map((rec, i) => (
                  <li key={i} className={styles.recItem}>
                    {rec.icon === 'zap' && <Zap size={14} className={styles.recIcon} />}
                    {rec.icon === 'alert' && <AlertCircle size={14} className={styles.recIconAlert} />}
                    {rec.icon === 'check' && <CheckCircle size={14} className={styles.recIconCheck} />}
                    {rec.message}
                  </li>
                ))}
              </ul>
            </div>

            {/* Process Button */}
            <button
              className={styles.processBtn}
              onClick={handleProcess}
              disabled={processing || status === ANALYSIS_STATUS.analyzing}
            >
              {processing ? (
                <>
                  <Loader size={18} className={styles.btnSpinner} />
                  Processing...
                </>
              ) : (
                <>
                  <Brain size={18} />
                  Process with AI
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}