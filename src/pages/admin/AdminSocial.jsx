import { useEffect, useState } from 'react';
import { useSocial } from '../../context/SocialContext';
import { useShop } from '../../context/ShopContext';
import { SOCIAL_CHANNELS, channelHref, validateValue } from '../../data/social';
import { IconCheck, IconClose, IconShare } from '../../components/Icons';
import SocialGlyph from '../../components/SocialGlyph';

export default function AdminSocial() {
  const { social, activeChannels, saveChannels, resetSocial } = useSocial();
  const { pushToast } = useShop();
  const [form, setForm] = useState(() =>
    Object.fromEntries(SOCIAL_CHANNELS.map((channel) => [channel.key, { ...social[channel.key] }])),
  );
  const [errors, setErrors] = useState({});
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    if (!resetOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setResetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [resetOpen]);

  const change = (key, patch) => {
    setForm((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    for (const channel of SOCIAL_CHANNELS) {
      const row = form[channel.key];
      const empty = !String(row.value || '').trim();
      if (empty && !row.enabled) continue;
      const message = validateValue(channel, row.value);
      if (message) next[channel.key] = message;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const channelsNext = Object.fromEntries(
      SOCIAL_CHANNELS.map((channel) => [
        channel.key,
        {
          value: String(form[channel.key].value || '').trim(),
          enabled: Boolean(form[channel.key].enabled),
        },
      ]),
    );
    const ok = await saveChannels(channelsNext);
    if (ok) pushToast('সোশ্যাল লিংক আপডেট হয়েছে');
  };

  const restoreDefaults = async () => {
    await resetSocial();
    setForm(
      Object.fromEntries(
        SOCIAL_CHANNELS.map((channel) => [
          channel.key,
          { value: channel.defaultValue, enabled: channel.defaultOn },
        ]),
      ),
    );
    setErrors({});
    setResetOpen(false);
    pushToast('সোশ্যাল লিংক ডিফল্টে ফিরেছে');
  };

  const previewChannels = SOCIAL_CHANNELS.filter((channel) => {
    const row = form[channel.key];
    return row.enabled && channelHref(channel, row.value);
  });

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <div>
          <h2>
            সোশ্যাল ও যোগাযোগ <span className="adm-count">{activeChannels.length}</span>
          </h2>
          <p>যে চ্যানেলগুলো চালু থাকবে, সেগুলো সাইটের ডান-নিচে ফ্লোটিং বাটন হিসেবে দেখাবে।</p>
        </div>
        <div className="adm-page-actions">
          <button type="button" className="adm-btn ghost sm" onClick={() => setResetOpen(true)}>
            ডিফল্টে ফিরান
          </button>
          <button type="submit" form="adm-social-form" className="adm-btn primary sm">
            <IconCheck /> সেভ করুন
          </button>
        </div>
      </div>

      <form id="adm-social-form" className="adm-social-wrap" onSubmit={submit}>
        <div className="adm-card adm-social-list">
          {SOCIAL_CHANNELS.map((channel) => {
            const row = form[channel.key];
            const href = channelHref(channel, row.value);
            const hasError = Boolean(errors[channel.key]);
            return (
              <div className={`adm-social-row${row.enabled ? '' : ' off'}`} key={channel.key}>
                <span className={`adm-social-ic ${channel.key}`}>
                  <SocialGlyph channel={channel.key} />
                </span>

                <div className="adm-social-body">
                  <div className="adm-social-head">
                    <div>
                      <strong>{channel.label}</strong>
                      <small>{row.enabled ? (href ? 'সাইটে দেখাচ্ছে' : 'লিংক দরকার') : 'বন্ধ আছে'}</small>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={row.enabled}
                      aria-label={`${channel.label} ${row.enabled ? 'বন্ধ করুন' : 'চালু করুন'}`}
                      className={`adm-switch${row.enabled ? ' on' : ''}`}
                      onClick={() => change(channel.key, { enabled: !row.enabled })}
                    >
                      <span />
                    </button>
                  </div>

                  <label className="adm-field">
                    <span>{channel.profileLabel}</span>
                    <input
                      className={`adm-input${hasError ? ' has-error' : ''}`}
                      value={row.value}
                      onChange={(e) => change(channel.key, { value: e.target.value })}
                      placeholder={channel.placeholder}
                    />
                    {hasError ? (
                      <small className="adm-error-text">{errors[channel.key]}</small>
                    ) : (
                      <small className="adm-hint">{channel.hint}</small>
                    )}
                  </label>

                  {href && (
                    <a className="adm-social-link" href={href} target="_blank" rel="noreferrer">
                      {href}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <aside className="adm-card adm-social-preview">
          <h3>লাইভ প্রিভিউ</h3>
          <p>সাইটের ডান-নিচে ঠিক এভাবে দেখা যাবে।</p>
          <div className="adm-dock-preview">
            {previewChannels.length === 0 ? (
              <small>কোনো চ্যানেল চালু নেই</small>
            ) : (
              [...previewChannels].reverse().map((channel) => (
                <span className={`adm-dock-dot ${channel.key}`} key={channel.key}>
                  <SocialGlyph channel={channel.key} />
                </span>
              ))
            )}
          </div>
          <div className="adm-social-tip">
            <IconShare />
            <p>নম্বর বা ইউজারনেম বদলালে হোম, প্রোডাক্ট, ফুটার আর ফ্লোটিং বাটনের লিংকও বদলে যাবে।</p>
          </div>
        </aside>
      </form>

      {resetOpen && (
        <div className="adm-modal" role="dialog" aria-modal="true" aria-label="ডিফল্টে ফিরান">
          <button type="button" className="adm-modal-veil" aria-label="বন্ধ করুন" onClick={() => setResetOpen(false)} />
          <div className="adm-modal-card">
            <div className="adm-modal-head">
              <div>
                <span className="adm-chip cook">রিসেট</span>
                <h2>লিংক ডিফল্টে ফিরাবেন?</h2>
                <p>আপনার দেওয়া সব নম্বর ও ইউজারনেম মুছে ডেমো লিংক ফিরে আসবে।</p>
              </div>
              <button type="button" className="adm-icon-btn" onClick={() => setResetOpen(false)} aria-label="বন্ধ করুন">
                <IconClose />
              </button>
            </div>
            <div className="adm-modal-foot">
              <button type="button" className="adm-btn ghost sm" onClick={() => setResetOpen(false)}>
                বাতিল
              </button>
              <button type="button" className="adm-btn danger sm" onClick={restoreDefaults}>
                ডিফল্টে ফিরান
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
