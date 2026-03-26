/**
 * AI Agent API Service
 * Frontend service for AI-powered features
 */

import api from './api';

// ─── Image Analysis Agent ───────────────────────────────────────────────────

/**
 * Analyze an image for characteristics and quality
 */
export const analyzeImage = async (formData) => {
  const response = await api.post('/ai/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/**
 * Batch analyze multiple images
 */
export const batchAnalyzeImages = async (formData) => {
  const response = await api.post('/ai/analyze-batch', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// ─── Anomaly Detection Agent ─────────────────────────────────────────────────

/**
 * Detect anomalies in an image
 */
export const detectAnomalies = async (formData) => {
  const response = await api.post('/ai/detect-anomalies', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/**
 * Validate detection results for anomalies
 */
export const validateDetection = async (detectionData) => {
  const response = await api.post('/ai/validate', { detectionData });
  return response.data;
};

// ─── Smart Processing Agent ───────────────────────────────────────────────────

/**
 * Process image with intelligent decision making
 */
export const smartProcess = async (formData) => {
  const response = await api.post('/ai/smart-process', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

/**
 * Get processing recommendations for a detection
 */
export const getRecommendations = async (detectionId) => {
  const response = await api.get(`/ai/recommendations/${detectionId}`);
  return response.data;
};

/**
 * Compare different processing strategies
 */
export const compareStrategies = async (formData) => {
  const response = await api.post('/ai/compare-strategies', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// ─── Prediction Agent ─────────────────────────────────────────────────────────

/**
 * Get user insights and predictions
 */
export const getUserInsights = async () => {
  const response = await api.get('/ai/insights');
  return response.data;
};

/**
 * Get personalized predictions
 */
export const getPredictions = async () => {
  const response = await api.get('/ai/predictions');
  return response.data;
};

/**
 * Get fleet analytics and risk assessment
 */
export const getFleetAnalytics = async () => {
  const response = await api.get('/ai/fleet-analytics');
  return response.data;
};

/**
 * Predict vehicle type from plate number
 */
export const predictVehicleType = async (plateNumber, region) => {
  const response = await api.post('/ai/predict-vehicle-type', { plateNumber, region });
  return response.data;
};

// ─── Agent Status ────────────────────────────────────────────────────────────

/**
 * Get AI agents status and capabilities
 */
export const getAgentStatus = async () => {
  const response = await api.get('/ai/status');
  return response.data;
};

/**
 * Get AI agents capabilities (public endpoint)
 */
export const getCapabilities = async () => {
  const response = await api.get('/ai/capabilities');
  return response.data;
};

// ─── Combined AI Features ───────────────────────────────────────────────────

/**
 * Process with full AI capabilities (analysis + anomalies + smart processing)
 */
export const processWithAI = async (formData, strategy = 'balanced') => {
  formData.append('strategy', strategy);
  formData.append('useAdvanced', 'true');
  return smartProcess(formData);
};

/**
 * Get complete insights including predictions and analytics
 */
export const getCompleteInsights = async () => {
  const [insights, predictions, fleetAnalytics] = await Promise.all([
    getUserInsights(),
    getPredictions(),
    getFleetAnalytics()
  ]);
  
  return {
    ...insights.data,
    predictions: predictions.data,
    fleetAnalytics: fleetAnalytics.data
  };
};

const aiServiceExport = {
  analyzeImage,
  batchAnalyzeImages,
  detectAnomalies,
  validateDetection,
  smartProcess,
  getRecommendations,
  compareStrategies,
  getUserInsights,
  getPredictions,
  getFleetAnalytics,
  predictVehicleType,
  getAgentStatus,
  getCapabilities,
  processWithAI,
  getCompleteInsights
};

export default aiServiceExport;