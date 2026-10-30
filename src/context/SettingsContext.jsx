import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, notify, peekBootstrap } from '../api/client';
import { DEFAULT_SETTINGS } from '../data/settings';

const SettingsContext = createContext(null);

const initialSettings = () => {
  const boot = peekBootstrap();
  const saved = boot?.settings || {};
  return {
    buyNow: { ...DEFAULT_SETTINGS.buyNow, ...(saved.buyNow || {}) },
    promo: { ...DEFAULT_SETTINGS.promo, ...(saved.promo || {}) },
    imgbbKeySet: Boolean(saved.imgbbKeySet),
  };
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(initialSettings);

  const save = useCallback(async (patch) => {
    try {
      const data = await api('/admin/settings', { method: 'PUT', body: patch });
      setSettings({
        buyNow: data.settings.buyNow,
        promo: data.settings.promo,
        imgbbKeySet: Boolean(data.settings.imgbbKeySet),
      });
      return true;
    } catch (err) {
      notify(err.message);
      return false;
    }
  }, []);

  const setBuyNow = useCallback(
    (patch) => save({ buyNow: { ...settings.buyNow, ...patch } }),
    [save, settings.buyNow],
  );

  const setPromo = useCallback(
    (patch) => save({ promo: { ...settings.promo, ...patch } }),
    [save, settings.promo],
  );

  const setImgbbKey = useCallback((key) => save({ imgbbKey: key }), [save]);

  const resetSettings = useCallback(
    () => save({ buyNow: DEFAULT_SETTINGS.buyNow, promo: DEFAULT_SETTINGS.promo }),
    [save],
  );

  const value = useMemo(
    () => ({
      settings,
      buyNow: settings.buyNow,
      promo: settings.promo,
      imgbbKeySet: settings.imgbbKeySet,
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
