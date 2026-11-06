import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        console.log('Service Worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('Service Worker registration skipped or failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
