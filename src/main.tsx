import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/main.css';
import { registerServiceWorker } from './registerServiceWorker';

void registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
