import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, notify, peekBootstrap } from '../api/client';
import { DEFAULT_BANNERS } from '../data/banners';

const BannerContext = createContext(null);

const seed = () => DEFAULT_BANNERS.map((b) => ({ ...b }));

export function BannerProvider({ children }) {
  const [banners, setBanners] = useState(() => peekBootstrap()?.banners ?? seed());

  const persist = useCallback(async (next) => {
    setBanners(next);
    try {
      const data = await api('/admin/banners', { method: 'PUT', body: { banners: next } });
      setBanners(data.banners);
    } catch (err) {
      notify(err.message);
      try {
        const fresh = await api('/bootstrap');
        setBanners(fresh.banners);
      } catch {
        /* keep last known banners */
      }
    }
  }, []);

  const addBanner = useCallback((banner) => persist([...banners, banner]), [banners, persist]);

  const updateBanner = useCallback(
    (id, patch) => persist(banners.map((b) => (b.id === id ? { ...b, ...patch } : b))),
    [banners, persist],
  );

  const deleteBanner = useCallback((id) => persist(banners.filter((b) => b.id !== id)), [banners, persist]);

  const toggleBanner = useCallback(
    (id) => persist(banners.map((b) => (b.id === id ? { ...b, active: !b.active } : b))),
    [banners, persist],
  );

  const moveBanner = useCallback(
    (id, dir) => {
      const from = banners.findIndex((b) => b.id === id);
      const to = from + dir;
      if (from < 0 || to < 0 || to >= banners.length) return;
      const next = [...banners];
      [next[from], next[to]] = [next[to], next[from]];
      persist(next);
    },
    [banners, persist],
  );

  const resetBanners = useCallback(() => persist(seed()), [persist]);

  const value = useMemo(
    () => ({
      banners,
      activeBanners: banners.filter((b) => b.active),
      addBanner,
      updateBanner,
      deleteBanner,
      toggleBanner,
      moveBanner,
      resetBanners,
    }),
    [banners, addBanner, updateBanner, deleteBanner, toggleBanner, moveBanner, resetBanners],
  );

  return <BannerContext.Provider value={value}>{children}</BannerContext.Provider>;
}

export function useBanners() {
  const ctx = useContext(BannerContext);
  if (!ctx) throw new Error('useBanners must be used inside BannerProvider');
  return ctx;
}
