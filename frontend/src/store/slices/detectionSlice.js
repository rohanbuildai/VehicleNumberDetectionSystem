import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import toast from 'react-hot-toast';

export const submitDetection = createAsyncThunk('detection/submit', async (formData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/detection/detect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Detection failed');
  }
});

export const fetchDetections = createAsyncThunk('detection/fetchAll', async (params = {}, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams(params).toString();
    const { data } = await api.get(`/detection?${query}`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const fetchDetection = createAsyncThunk('detection/fetchOne', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/detection/${id}`);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const pollJobStatus = createAsyncThunk('detection/pollJob', async (jobId, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/detection/job/${jobId}`);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const deleteDetection = createAsyncThunk('detection/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/detection/${id}`);
    toast.success('Detection deleted');
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const fetchStats = createAsyncThunk('detection/stats', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/analytics/dashboard');
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const toggleFavorite = createAsyncThunk('detection/toggleFavorite', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/detection/${id}/favorite`);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

// Stage → progress % mapping (mirrors backend stages)
const STAGE_PROGRESS = {
  pending:    5,
  analyzing:  15,
  enhancing:  35,
  detecting:  60,
  annotating: 80,
  saving:     92,
  completed:  100,
  failed:     0,
};

const detectionSlice = createSlice({
  name: 'detection',
  initialState: {
    detections: [],
    currentDetection: null,
    activeJob: null,
    stats: null,
    pagination: { page: 1, limit: 10, total: 0, pages: 1 },
    loading: false,
    submitting: false,
    jobStatus: null,
    jobProgress: 0,
    error: null,
  },
  reducers: {
    setJobProgress: (state, action) => {
      const { stage, progress } = action.payload;
      // Only move forward — never go backwards
      const next = progress ?? STAGE_PROGRESS[stage] ?? state.jobProgress;
      if (next > state.jobProgress) {
        state.jobProgress = next;
      }
      if (stage) state.jobStatus = stage;
    },
    setJobResult: (state, action) => {
      state.jobStatus = action.payload.status;
      if (action.payload.status === 'completed') {
        state.jobProgress = 100;
      }
      if (action.payload.data) {
        state.currentDetection = action.payload.data;
        state.detections = [
          action.payload.data,
          ...state.detections.filter(d => d._id !== action.payload.data._id),
        ];
      }
    },
    clearActiveJob: (state) => {
      state.activeJob  = null;
      state.jobStatus  = null;
      state.jobProgress = 0;
    },
    setCurrentDetection: (state, action) => {
      state.currentDetection = action.payload;
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitDetection.pending, (state) => {
        state.submitting    = true;
        state.error         = null;
        state.jobProgress   = 5;
        state.jobStatus     = 'pending';
        state.currentDetection = null;
      })
      .addCase(submitDetection.fulfilled, (state, action) => {
        state.submitting = false;
        state.activeJob  = {
          jobId:       action.payload.jobId,
          detectionId: action.payload.detectionId,
        };
        state.jobStatus   = 'processing';
        state.jobProgress = 10;
        toast.success('Image submitted — detecting now…');
      })
      .addCase(submitDetection.rejected, (state, action) => {
        state.submitting  = false;
        state.jobStatus   = 'failed';
        state.jobProgress = 0;
        state.error       = action.payload;
        toast.error(action.payload || 'Submission failed');
      })

      // HTTP poll result
      .addCase(pollJobStatus.fulfilled, (state, action) => {
        const det = action.payload;
        if (!det) return;
        const statusProgress = STAGE_PROGRESS[det.status] ?? state.jobProgress;
        if (statusProgress > state.jobProgress) {
          state.jobProgress = statusProgress;
        }
        state.jobStatus = det.status;
        if (det.status === 'completed' || det.status === 'failed') {
          state.currentDetection = det;
          if (det.status === 'completed') {
            state.jobProgress = 100;
            state.detections  = [det, ...state.detections.filter(d => d._id !== det._id)];
          }
        }
      })

      .addCase(fetchDetections.pending,   (state) => { state.loading = true; })
      .addCase(fetchDetections.fulfilled, (state, action) => {
        state.loading    = false;
        state.detections = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchDetections.rejected,  (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      .addCase(fetchDetection.fulfilled, (state, action) => {
        state.currentDetection = action.payload;
      })

      .addCase(deleteDetection.fulfilled, (state, action) => {
        state.detections = state.detections.filter(d => d._id !== action.payload);
      })

      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })

      .addCase(toggleFavorite.fulfilled, (state, action) => {
        const idx = state.detections.findIndex(d => d._id === action.payload._id);
        if (idx !== -1) state.detections[idx] = action.payload;
        if (state.currentDetection?._id === action.payload._id) {
          state.currentDetection = action.payload;
        }
      });
  },
});

export const {
  setJobProgress,
  setJobResult,
  clearActiveJob,
  setCurrentDetection,
  clearError,
} = detectionSlice.actions;

export { STAGE_PROGRESS };
export default detectionSlice.reducer;
