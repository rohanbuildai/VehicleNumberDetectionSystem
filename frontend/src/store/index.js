import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import detectionReducer from './slices/detectionSlice';
import uiReducer from './slices/uiSlice';
import aiReducer from './slices/aiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    detection: detectionReducer,
    ui: uiReducer,
    ai: aiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: { ignoredActions: ['detection/setCurrentDetection'] } }),
});
