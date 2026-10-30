import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const SettingsContext = createContext(null);

const SETTINGS_KEY = 'cakehaus_settings_v1';

const DEFAULT_SETTINGS = {
  buyNow: { enabled: true, message: '' },
  imgbbKey: '',
  promo: {
    enabled: true,
    kicker: 'আজকের অফার',
    title: 'প্রতিটি জন্মদিনের কেকে ১০% ছাড়',
    desc: 'চেকআউটে কোড ব্যবহার করুন — সীমিত সময়ের জন্য।',
    code: 'HBD10',
    ctaLabel: 'অফার দেখুন',
    ctaTo: '/shop?cat=birthday',
  },
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      buyNow: { ...DEFAULT_SETTINGS.buyNow, ...(parsed.buyNow || {}) },
      promo: { ...DEFAULT_SETTINGS.promo, ...(parsed.promo || {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const sync = (event) => {
      if (event.key !== SETTINGS_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        if (!parsed || typeof parsed !== 'object') return;
        setSettings((prev) => (JSON.stringify(prev) === event.newValue ? prev : parsed));
      } catch {
        /* ignore malformed payload from another tab */
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const setBuyNow = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, buyNow: { ...prev.buyNow, ...patch } }));
  }, []);

  const setPromo = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, promo: { ...prev.promo, ...patch } }));
  }, []);

  const setImgbbKey = useCallback((key) => {
    setSettings((prev) => ({ ...prev, imgbbKey: key }));
  }, []);

  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(
    () => ({
      settings,
      buyNow: settings.buyNow,
      promo: settings.promo,
      imgbbKey: settings.imgbbKey,
      setBuyNow,
      setPromo,
      setImgbbKey,
      resetSettings,
    }),
    [settings, setBuyNow, setPromo, setImgbbKey, resetSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
