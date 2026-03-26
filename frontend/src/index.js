import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { store } from './store';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a2035',
              color: '#e0e0e0',
              border: '1px solid rgba(0,255,136,0.2)',
              borderRadius: '8px',
              fontFamily: 'Space Grotesk, sans-serif',
            },
            success: { iconTheme: { primary: '#00ff88', secondary: '#0a0f1e' } },
            error: { iconTheme: { primary: '#ff6b6b', secondary: '#0a0f1e' } },
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
