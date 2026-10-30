import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, notify, peekBootstrap } from '../api/client';
import { SOCIAL_CHANNELS, WHATSAPP, channelHref, phoneLabel, phoneTel } from '../data/social';

const SocialContext = createContext(null);

const defaults = () =>
  Object.fromEntries(
    SOCIAL_CHANNELS.map((channel) => [channel.key, { value: channel.defaultValue, enabled: channel.defaultOn }]),
  );

const seed = () => {
  const base = defaults();
  const saved = peekBootstrap()?.social || {};
  for (const channel of SOCIAL_CHANNELS) {
    const row = saved[channel.key];
    if (row && typeof row === 'object') {
      base[channel.key] = { value: String(row.value ?? base[channel.key].value), enabled: Boolean(row.enabled) };
    }
  }
  return base;
};

export function SocialProvider({ children }) {
  const [social, setSocial] = useState(seed);

  const saveChannels = useCallback(async (next) => {
    setSocial(next);
    try {
      const data = await api('/admin/social', { method: 'PUT', body: { social: next } });
      setSocial(data.social);
      return true;
    } catch (err) {
      notify(err.message);
      return false;
    }
  }, []);

  const setChannel = useCallback(
    (key, patch) => {
      const next = { ...social, [key]: { ...social[key], ...patch } };
      return saveChannels(next);
    },
    [social, saveChannels],
  );

  const resetSocial = useCallback(() => saveChannels(defaults()), [saveChannels]);

  const value = useMemo(() => {
    const channels = SOCIAL_CHANNELS.map((channel) => {
      const row = social[channel.key] || defaults()[channel.key];
      return { ...channel, ...row, href: row.enabled ? channelHref(channel, row.value) : '' };
    });
    const waRow = social[WHATSAPP.key] || defaults()[WHATSAPP.key];
    const waHref = channelHref(WHATSAPP, waRow.value) || channelHref(WHATSAPP, WHATSAPP.defaultValue);

    return {
      social,
      channels,
      activeChannels: channels.filter((channel) => channel.enabled && channel.href),
      whatsappHref: (text) => (waHref ? (text ? `${waHref}?text=${encodeURIComponent(text)}` : waHref) : ''),
      whatsappLabel: phoneLabel(waRow.value),
      whatsappTel: phoneTel(waRow.value),
      setChannel,
      saveChannels,
      resetSocial,
    };
  }, [social, setChannel, saveChannels, resetSocial]);

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used inside SocialProvider');
  return ctx;
}
