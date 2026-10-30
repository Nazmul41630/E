import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { loadBootstrap, peekBootstrap } from './api/client.js';
import { AuthProvider } from './context/AuthContext.jsx';
import { BannerProvider } from './context/BannerContext.jsx';
import { CatalogProvider } from './context/CatalogContext.jsx';
import { SocialProvider } from './context/SocialContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { ShopProvider } from './context/ShopContext.jsx';
import './styles.css';

function BootstrapGate({ children }) {
  const [state, setState] = useState(peekBootstrap() ? 'ready' : 'loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (state !== 'loading') return undefined;
    let alive = true;
    loadBootstrap()
      .then(() => {
        if (alive) setState('ready');
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message);
        setState('error');
      });
    return () => {
      alive = false;
    };
  }, [attempt, state]);

  const retry = () => {
    setState('loading');
    setError('');
    setAttempt((n) => n + 1);
  };

  if (state === 'ready') return children;

  return (
    <div className="boot-screen">
      <div className="boot-card">
        <img src="/images/logo-96.webp" alt="CakeHaus" width="56" height="56" />
        {state === 'loading' ? (
          <>
            <span className="boot-spinner" aria-hidden="true" />
            <p>দোকান প্রস্তুত হচ্ছে…</p>
          </>
        ) : (
          <>
            <h1>সার্ভারে পৌঁছানো যায়নি</h1>
            <p>{error || 'একটু পরে আবার চেষ্টা করুন।'}</p>
            <button type="button" className="btn primary" onClick={retry}>
              আবার চেষ্টা করুন
            </button>
          </>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <BootstrapGate>
        <BannerProvider>
          <SocialProvider>
            <CatalogProvider>
              <SettingsProvider>
                <AuthProvider>
                  <ShopProvider>
                    <App />
                  </ShopProvider>
                </AuthProvider>
              </SettingsProvider>
            </CatalogProvider>
          </SocialProvider>
        </BannerProvider>
      </BootstrapGate>
    </BrowserRouter>
  </StrictMode>,
);
