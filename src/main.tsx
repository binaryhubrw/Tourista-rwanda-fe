import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

for (const key of Object.keys(localStorage)) {
  if (key.startsWith('tourista.db.')) localStorage.removeItem(key);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
