/**
 * AI Agent: Prediction & Insights Agent
 * Provides predictions, insights, and recommendations based on detection history and patterns
 */

const mongoose = require('mongoose');
const Detection = require('../models/Detection');
const Vehicle = require('../models/Vehicle');

class PredictionAgent {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get comprehensive insights for a user
   */
  async getUserInsights(userId) {
    try {
      const cacheKey = `insights_${userId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const detections = await Detection.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      if (detections.length === 0) {
        return this.getEmptyInsights();
      }

      const insights = {
        detectionPattern: this.analyzeDetectionPattern(detections),
        timeAnalytics: this.analyzeTimePatterns(detections),
        successRate: this.calculateSuccessRate(detections),
        avgProcessingTime: this.calculateAvgProcessingTime(detections),
        qualityTrend: this.analyzeQualityTrend(detections),
        predictions: await this.generatePredictions(detections, userId),
        recommendations: this.generateRecommendations(detections)
      };

      this.setCache(cacheKey, insights);
      return insights;
    } catch (error) {
      console.error('PredictionAgent getUserInsights error:', error);
      return this.getEmptyInsights();
    }
  }

  analyzeDetectionPattern(detections) {
    const plateCounts = {};
    const formatCounts = {};

    detections.forEach(d => {
      if (d.plateNumber) {
        plateCounts[d.plateNumber] = (plateCounts[d.plateNumber] || 0) + 1;
      }
      if (d.region) {
        formatCounts[d.region] = (formatCounts[d.region] || 0) + 1;
      }
    });

    const topPlates = Object.entries(plateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([plate, count]) => ({ plate, count }));

    const dominantRegion = Object.entries(formatCounts)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      totalDetections: detections.length,
      uniquePlates: Object.keys(plateCounts).length,
      topPlates,
      dominantRegion: dominantRegion ? dominantRegion[0] : 'unknown',
      repeatRate: detections.length > 0 
        ? ((detections.length - Object.keys(plateCounts).length) / detections.length * 100).toFixed(1)
        : 0
    };
  }

  analyzeTimePatterns(detections) {
    const hourlyDistribution = new Array(24).fill(0);
    const dailyDistribution = new Array(7).fill(0);
    const weeklyVolume = {};

    detections.forEach(d => {
      const date = new Date(d.createdAt);
      hourlyDistribution[date.getHours()]++;
      dailyDistribution[date.getDay()]++;

      const weekKey = getWeekKey(date);
      weeklyVolume[weekKey] = (weeklyVolume[weekKey] || 0) + 1;
    });

    const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
    const peakDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dailyDistribution.indexOf(Math.max(...dailyDistribution))];

    const recentWeeks = Object.entries(weeklyVolume)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 4);

    const trend = recentWeeks.length >= 2 
      ? recentWeeks[0][1] > recentWeeks[1][1] ? 'increasing' : 'decreasing'
      : 'stable';

    return {
      peakHour,
      peakDay,
      hourlyDistribution,
      dailyDistribution,
      weeklyTrend: trend,
      avgPerDay: (detections.length / 7).toFixed(1)
    };
  }

  calculateSuccessRate(detections) {
    const successful = detections.filter(d => d.plateNumber && d.confidence > 50).length;
    const total = detections.length;
    return {
      rate: total > 0 ? ((successful / total) * 100).toFixed(1) : 0,
      successful,
      failed: total - successful
    };
  }

  calculateAvgProcessingTime(detections) {
    const times = detections
      .filter(d => d.processingTime)
      .map(d => d.processingTime);
    
    if (times.length === 0) return 0;
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return Math.round(avg);
  }

  analyzeQualityTrend(detections) {
    const recent = detections.slice(0, Math.min(20, detections.length));
    const older = detections.slice(20, Math.min(40, detections.length));

    const avgQuality = arr => {
      if (arr.length === 0) return 0;
      return arr.reduce((sum, d) => sum + (d.qualityScore || 0), 0) / arr.length;
    };

    const recentQuality = avgQuality(recent);
    const olderQuality = avgQuality(older);

    const change = olderQuality > 0 
      ? ((recentQuality - olderQuality) / olderQuality * 100).toFixed(1)
      : 0;

    return {
      current: Math.round(recentQuality),
      trend: parseFloat(change) > 5 ? 'improving' : parseFloat(change) < -5 ? 'declining' : 'stable',
      change: change
    };
  }

  async generatePredictions(detections, userId) {
    const predictions = [];

    // Predict next likely plate based on history
    const topPlates = Object.entries(
      detections.reduce((acc, d) => {
        if (d.plateNumber) {
          acc[d.plateNumber] = (acc[d.plateNumber] || 0) + 1;
        }
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);

    if (topPlates.length > 0) {
      predictions.push({
        type: 'likely_plate',
        confidence: Math.min(80, 50 + topPlates[0][1] * 10),
        message: `You likely to detect "${topPlates[0][0]}" again`,
        value: topPlates[0][0]
      });
    }

    // Predict busy time
    const hourCounts = detections.reduce((acc, d) => {
      const hour = new Date(d.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const busyHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0];

    if (busyHour) {
      predictions.push({
        type: 'busy_time',
        confidence: Math.min(90, 50 + parseInt(busyHour[1]) * 5),
        message: `Busiest time: ${formatHour(parseInt(busyHour[0]))}`,
        value: parseInt(busyHour[0])
      });
    }

    // Usage prediction
    const thisMonth = detections.filter(d => {
      const date = new Date(d.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    const lastMonth = detections.filter(d => {
      const date = new Date(d.createdAt);
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
    }).length;

    if (lastMonth > 0) {
      const growth = ((thisMonth - lastMonth) / lastMonth * 100).toFixed(0);
      predictions.push({
        type: 'usage_trend',
        confidence: 70,
        message: parseInt(growth) >= 0 
          ? `Usage up ${growth}% this month`
          : `Usage down ${Math.abs(growth)}% this month`,
        value: thisMonth
      });
    }

    // Predict success likelihood for next detection
    const successRate = detections.filter(d => d.plateNumber).length / detections.length;
    predictions.push({
      type: 'success_likelihood',
      confidence: Math.round(successRate * 100),
      message: `${Math.round(successRate * 100)}% chance of successful detection`,
      value: successRate
    });

    return predictions;
  }

  generateRecommendations(detections) {
    const recommendations = [];

    if (detections.length < 5) {
      recommendations.push({
        category: 'engagement',
        priority: 'medium',
        title: 'Build your detection history',
        description: 'Upload more images to get better insights and predictions'
      });
    }

    const qualityTrend = this.analyzeQualityTrend(detections);
    if (qualityTrend.trend === 'declining') {
      recommendations.push({
        category: 'quality',
        priority: 'high',
        title: 'Image quality declining',
        description: 'Consider using higher quality images for better detection results'
      });
    }

    const successRate = this.calculateSuccessRate(detections);
    if (parseFloat(successRate.rate) < 70) {
      recommendations.push({
        category: 'improvement',
        priority: 'high',
        title: 'Low detection success rate',
        description: 'Try with clearer images or better lighting conditions'
      });
    }

    const avgTime = this.calculateAvgProcessingTime(detections);
    if (avgTime > 5000) {
      recommendations.push({
        category: 'performance',
        priority: 'low',
        title: 'Processing time optimization',
        description: 'Smaller image sizes may reduce processing time'
      });
    }

    // Add positive feedback
    if (parseFloat(successRate.rate) >= 90) {
      recommendations.push({
        category: 'success',
        priority: 'info',
        title: 'Great detection accuracy!',
        description: 'Your images are yielding high success rates'
      });
    }

    return recommendations;
  }

  getEmptyInsights() {
    return {
      detectionPattern: {
        totalDetections: 0,
        uniquePlates: 0,
        topPlates: [],
        dominantRegion: 'N/A',
        repeatRate: 0
      },
      timeAnalytics: {
        peakHour: 12,
        peakDay: 'N/A',
        hourlyDistribution: new Array(24).fill(0),
        dailyDistribution: new Array(7).fill(0),
        weeklyTrend: 'stable',
        avgPerDay: '0'
      },
      successRate: { rate: 0, successful: 0, failed: 0 },
      avgProcessingTime: 0,
      qualityTrend: { current: 0, trend: 'stable', change: 0 },
      predictions: [],
      recommendations: [{
        category: 'getting_started',
        priority: 'info',
        title: 'Start detecting plates',
        description: 'Upload your first image to get personalized insights'
      }]
    };
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Predict vehicle type from plate number patterns
   */
  async predictVehicleType(plateNumber, region) {
    // Simple pattern-based prediction
    const patterns = {
      commercial: /^[A-Z]{2}[0-9]{2}[A-Z]{1,3}$/i,  // e.g., DL01ABC
      private: /^[A-Z][0-9]{1,4}[A-Z]{1,4}$/i,
      government: /^DL[0-9]{2}GOV/i,
      transport: /^[A-Z]{2}[0-9]{2}[T][A-Z]{1,3}$/i
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(plateNumber)) {
        return { type, confidence: 75 };
      }
    }

    return { type: 'unknown', confidence: 30 };
  }

  /**
   * Get fleet analytics
   */
  async getFleetAnalytics(userId) {
    try {
      const vehicles = await Vehicle.find({ user: userId }).lean();
      
      const analytics = {
        totalVehicles: vehicles.length,
        alertBreakdown: this.getAlertBreakdown(vehicles),
        frequencyDistribution: this.getFrequencyDistribution(vehicles),
        recentActivity: this.getRecentVehicleActivity(vehicles),
        riskAssessment: this.assessFleetRisk(vehicles)
      };

      return analytics;
    } catch (error) {
      console.error('Fleet analytics error:', error);
      return {
        totalVehicles: 0,
        alertBreakdown: {},
        frequencyDistribution: [],
        recentActivity: [],
        riskAssessment: { level: 'unknown', score: 0 }
      };
    }
  }

  getAlertBreakdown(vehicles) {
    const breakdown = { stolen: 0, wanted: 0, expired: 0, suspicious: 0 };
    vehicles.forEach(v => {
      if (v.alerts) {
        v.alerts.forEach(a => {
          if (breakdown[a.type] !== undefined) {
            breakdown[a.type]++;
          }
        });
      }
    });
    return breakdown;
  }

  getFrequencyDistribution(vehicles) {
    return vehicles
      .sort((a, b) => (b.detectionCount || 0) - (a.detectionCount || 0))
      .slice(0, 10)
      .map(v => ({
        plate: v.plateNumber,
        count: v.detectionCount || 0
      }));
  }

  getRecentVehicleActivity(vehicles) {
    return vehicles
      .sort((a, b) => new Date(b.lastDetected || 0) - new Date(a.lastDetected || 0))
      .slice(0, 5)
      .map(v => ({
        plate: v.plateNumber,
        lastSeen: v.lastDetected,
        alertStatus: v.alerts?.[0]?.type || 'none'
      }));
  }

  assessFleetRisk(vehicles) {
    const alertCount = vehicles.reduce((sum, v) => sum + (v.alerts?.length || 0), 0);
    const suspiciousCount = vehicles.filter(v => v.isSuspicious).length;
    
    const score = Math.min(100, (alertCount * 15) + (suspiciousCount * 25));
    
    let level = 'low';
    if (score >= 75) level = 'critical';
    else if (score >= 50) level = 'high';
    else if (score >= 25) level = 'medium';

    return { level, score };
  }
}

// Helper functions
function getWeekKey(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - start) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + start.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`;
}

function formatHour(hour) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:00 ${ampm}`;
}

module.exports = new PredictionAgent();