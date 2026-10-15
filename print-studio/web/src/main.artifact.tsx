// Entrada do build de artefato (sem servidor): tema claro por padrão, seguindo
// o Design System quando roda dentro dele (iframe srcdoc).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { syncTheme } from '../../../artifact-runtime/index.ts';
import './index.css';
import App from './App.tsx';

syncTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
