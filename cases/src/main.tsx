import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { syncTheme } from '@gove/runtime';
import './index.css';
import App from './App.tsx';

syncTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
