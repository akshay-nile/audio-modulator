import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PrimeReactProvider } from 'primereact/api';
import './index.css';
import App from './App';
import { HashRouter } from 'react-router';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrimeReactProvider value={{ ripple: true }}>
      <HashRouter>
        <App />
      </HashRouter>
    </PrimeReactProvider>
  </StrictMode>,
);
