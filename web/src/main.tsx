import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { UpgradeProvider } from './context/UpgradeContext';
import { ToastProvider } from './components/ui/Toast';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          {/* UpgradeProvider owns the global "buy a license" modal so the gate
              can be triggered from anywhere (sidebar, table row, header). */}
          <UpgradeProvider>
            <App />
          </UpgradeProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
