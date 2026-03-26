/**
 * AI Slice
 * Redux state management for AI features
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  analyzeImage,
  smartProcess,
  getUserInsights,
  getPredictions,
  getFleetAnalytics,
  getAgentStatus
} from '../../services/aiService';

// Async thunks

export const fetchUserInsights = createAsyncThunk(
  'ai/fetchUserInsights',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getUserInsights();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchPredictions = createAsyncThunk(
  'ai/fetchPredictions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getPredictions();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchFleetAnalytics = createAsyncThunk(
  'ai/fetchFleetAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getFleetAnalytics();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const fetchAgentStatus = createAsyncThunk(
  'ai/fetchAgentStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getAgentStatus();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const processWithAI = createAsyncThunk(
  'ai/processWithAI',
  async ({ file, strategy }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('strategy', strategy);
      const response = await smartProcess(formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const analyzeImageFile = createAsyncThunk(
  'ai/analyzeImage',
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await analyzeImage(formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Initial state

const initialState = {
  // User data
  insights: null,
  predictions: [],
  fleetAnalytics: null,
  
  // Agent status
  agentStatus: null,
  capabilities: null,
  
  // Current processing
  currentAnalysis: null,
  currentAnomalies: null,
  currentProcessing: null,
  
  // UI state
  loading: {
    insights: false,
    predictions: false,
    fleetAnalytics: false,
    agentStatus: false,
    processing: false,
    analyzing: false
  },
  error: {
    insights: null,
    predictions: null,
    fleetAnalytics: null,
    agentStatus: null,
    processing: null,
    analyzing: null
  },
  
  // Settings
  processingStrategy: 'balanced',
  
  // Timestamps
  lastFetch: {
    insights: null,
    predictions: null,
    fleetAnalytics: null,
    agentStatus: null
  }
};

// Slice

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    setProcessingStrategy: (state, action) => {
      state.processingStrategy = action.payload;
    },
    clearCurrentProcessing: (state) => {
      state.currentAnalysis = null;
      state.currentAnomalies = null;
      state.currentProcessing = null;
    },
    clearErrors: (state) => {
      state.error = {
        insights: null,
        predictions: null,
        fleetAnalytics: null,
        agentStatus: null,
        processing: null,
        analyzing: null
      };
    }
  },
  extraReducers: (builder) => {
    // Fetch User Insights
    builder
      .addCase(fetchUserInsights.pending, (state) => {
        state.loading.insights = true;
        state.error.insights = null;
      })
      .addCase(fetchUserInsights.fulfilled, (state, action) => {
        state.loading.insights = false;
        state.insights = action.payload;
        state.lastFetch.insights = new Date().toISOString();
      })
      .addCase(fetchUserInsights.rejected, (state, action) => {
        state.loading.insights = false;
        state.error.insights = action.payload;
      });

    // Fetch Predictions
    builder
      .addCase(fetchPredictions.pending, (state) => {
        state.loading.predictions = true;
        state.error.predictions = null;
      })
      .addCase(fetchPredictions.fulfilled, (state, action) => {
        state.loading.predictions = false;
        state.predictions = action.payload;
      })
      .addCase(fetchPredictions.rejected, (state, action) => {
        state.loading.predictions = false;
        state.error.predictions = action.payload;
      });

    // Fetch Fleet Analytics
    builder
      .addCase(fetchFleetAnalytics.pending, (state) => {
        state.loading.fleetAnalytics = true;
        state.error.fleetAnalytics = null;
      })
      .addCase(fetchFleetAnalytics.fulfilled, (state, action) => {
        state.loading.fleetAnalytics = false;
        state.fleetAnalytics = action.payload;
      })
      .addCase(fetchFleetAnalytics.rejected, (state, action) => {
        state.loading.fleetAnalytics = false;
        state.error.fleetAnalytics = action.payload;
      });

    // Fetch Agent Status
    builder
      .addCase(fetchAgentStatus.pending, (state) => {
        state.loading.agentStatus = true;
        state.error.agentStatus = null;
      })
      .addCase(fetchAgentStatus.fulfilled, (state, action) => {
        state.loading.agentStatus = false;
        state.agentStatus = action.payload.agents;
        state.capabilities = action.payload.features;
      })
      .addCase(fetchAgentStatus.rejected, (state, action) => {
        state.loading.agentStatus = false;
        state.error.agentStatus = action.payload;
      });

    // Process with AI
    builder
      .addCase(processWithAI.pending, (state) => {
        state.loading.processing = true;
        state.error.processing = null;
      })
      .addCase(processWithAI.fulfilled, (state, action) => {
        state.loading.processing = false;
        state.currentProcessing = action.payload;
      })
      .addCase(processWithAI.rejected, (state, action) => {
        state.loading.processing = false;
        state.error.processing = action.payload;
      });

    // Analyze Image
    builder
      .addCase(analyzeImageFile.pending, (state) => {
        state.loading.analyzing = true;
        state.error.analyzing = null;
      })
      .addCase(analyzeImageFile.fulfilled, (state, action) => {
        state.loading.analyzing = false;
        state.currentAnalysis = action.payload;
      })
      .addCase(analyzeImageFile.rejected, (state, action) => {
        state.loading.analyzing = false;
        state.error.analyzing = action.payload;
      });
  }
});

export const { setProcessingStrategy, clearCurrentProcessing, clearErrors } = aiSlice.actions;
export default aiSlice.reducer;