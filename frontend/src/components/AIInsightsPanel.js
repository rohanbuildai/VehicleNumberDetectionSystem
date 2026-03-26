/**
 * AI Insights Panel Component
 * Displays AI-powered insights, predictions, and recommendations
 */

import React, { useEffect, useState } from 'react';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Car, Clock, Target, Zap, Loader, RefreshCw } from 'lucide-react';
import { getCompleteInsights } from '../services/aiService';
import styles from './AIInsightsPanel.module.css';

export default function AIInsightsPanel() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCompleteInsights();
      setInsights(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch insights:', err);
      setError('Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const formatTime = (hour) => {
    const h = hour % 12 || 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${h}:00 ${ampm}`;
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing': return <TrendingUp size={14} />;
      case 'decreasing': return <TrendingDown size={14} />;
      default: return <TrendingUp size={14} style={{ transform: 'rotate(45deg)' }} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'var(--danger)';
      case 'medium': return 'var(--warning)';
      default: return 'var(--accent)';
    }
  };

  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <Brain size={20} />
          <span>AI Insights</span>
        </div>
        <div className={styles.loadingState}>
          <Loader className={styles.spinner} size={24} />
          <span>Analyzing your data...</span>
        </div>
      </div>
    );
  }

  if (error && !insights) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <Brain size={20} />
          <span>AI Insights</span>
        </div>
        <div className={styles.errorState}>
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button className={styles.retryBtn} onClick={fetchInsights}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const pattern = insights?.detectionPattern || {};
  const timeAnalytics = insights?.timeAnalytics || {};
  const successRate = insights?.successRate || {};
  const qualityTrend = insights?.qualityTrend || {};
  const predictions = insights?.predictions || [];
  const recommendations = insights?.recommendations || [];

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Brain size={20} />
          <span>AI Insights</span>
        </div>
        <button className={styles.refreshBtn} onClick={fetchInsights} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Quick Stats */}
      <div className={styles.quickStats}>
        <div className={styles.quickStat}>
          <Target size={16} />
          <div>
            <span className={styles.quickValue}>{pattern.totalDetections || 0}</span>
            <span className={styles.quickLabel}>Detections</span>
          </div>
        </div>
        <div className={styles.quickStat}>
          <Car size={16} />
          <div>
            <span className={styles.quickValue}>{pattern.uniquePlates || 0}</span>
            <span className={styles.quickLabel}>Unique Plates</span>
          </div>
        </div>
        <div className={styles.quickStat}>
          <Zap size={16} />
          <div>
            <span className={styles.quickValue}>{successRate.rate || 0}%</span>
            <span className={styles.quickLabel}>Success Rate</span>
          </div>
        </div>
      </div>

      {/* Predictions */}
      {predictions.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span>Predictions</span>
            {getTrendIcon(timeAnalytics.weeklyTrend)}
          </div>
          <div className={styles.predictionsList}>
            {predictions.slice(0, 4).map((pred, i) => (
              <div key={i} className={styles.predictionItem}>
                <div className={styles.predIcon}>
                  {pred.type === 'likely_plate' && <Car size={14} />}
                  {pred.type === 'busy_time' && <Clock size={14} />}
                  {pred.type === 'usage_trend' && <TrendingUp size={14} />}
                  {pred.type === 'success_likelihood' && <Target size={14} />}
                </div>
                <div className={styles.predContent}>
                  <span className={styles.predMessage}>{pred.message}</span>
                  <span className={styles.predConfidence}>{pred.confidence}% confidence</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Analytics */}
      {timeAnalytics.peakHour !== undefined && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span>Peak Activity</span>
          </div>
          <div className={styles.peakInfo}>
            <div className={styles.peakItem}>
              <Clock size={14} />
              <span>Busiest: {formatTime(timeAnalytics.peakHour)}</span>
            </div>
            <div className={styles.peakItem}>
              <span>Day: {timeAnalytics.peakDay || 'N/A'}</span>
            </div>
            <div className={styles.peakItem}>
              <span>Trend: {timeAnalytics.weeklyTrend || 'stable'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Quality Trend */}
      {qualityTrend.current !== undefined && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span>Quality Trend</span>
            <span className={styles[`trend${qualityTrend.trend}`]}>
              {getTrendIcon(qualityTrend.trend)}
              {qualityTrend.trend}
            </span>
          </div>
          <div className={styles.qualityBar}>
            <div
              className={styles.qualityFill}
              style={{
                width: `${qualityTrend.current}%`,
                backgroundColor: qualityTrend.current >= 60 ? 'var(--success)' : 'var(--warning)'
              }}
            />
          </div>
          <div className={styles.qualityMeta}>
            <span>Current: {qualityTrend.current}</span>
            <span>Change: {qualityTrend.change > 0 ? '+' : ''}{qualityTrend.change}%</span>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span>Recommendations</span>
          </div>
          <div className={styles.recommendationsList}>
            {recommendations.slice(0, 3).map((rec, i) => (
              <div key={i} className={styles.recommendation}>
                <div
                  className={styles.recDot}
                  style={{ backgroundColor: getPriorityColor(rec.priority) }}
                />
                <div className={styles.recContent}>
                  <span className={styles.recTitle}>{rec.title}</span>
                  <span className={styles.recDesc}>{rec.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {lastUpdated && (
        <div className={styles.footer}>
          <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}