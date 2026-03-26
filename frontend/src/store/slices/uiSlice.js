import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    theme: localStorage.getItem('theme') || 'dark',
    modalOpen: null,
    notifications: [],
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen: (state, action) => { state.sidebarOpen = action.payload; },
    openModal: (state, action) => { state.modalOpen = action.payload; },
    closeModal: (state) => { state.modalOpen = null; },
    addNotification: (state, action) => {
      state.notifications.unshift({ id: Date.now(), ...action.payload });
      if (state.notifications.length > 20) state.notifications.pop();
    },
    clearNotifications: (state) => { state.notifications = []; },
  },
});

export const { toggleSidebar, setSidebarOpen, openModal, closeModal, addNotification, clearNotifications } = uiSlice.actions;
export default uiSlice.reducer;
