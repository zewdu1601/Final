import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Add an element with id="root" to public/index.html.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);