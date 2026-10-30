import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useShop } from '../../context/ShopContext';
import { formatTaka } from '../../data/products';
import { IconCheck, IconCart, IconImage, IconSettings, IconShield, IconTag } from '../../components/Icons';

const DEFAULT_LABEL = 'এখনই কিনুন';
const PROMO_FIELDS = ['kicker', 'title', 'desc', 'code', 'ctaLabel', 'ctaTo'];

export default function AdminSettings() {
  const { buyNow, promo, imgbbKeySet, setBuyNow, setPromo, setImgbbKey, resetSettings } = useSettings();
  const { changePassword } = useAuth();
  const { pushToast } = useShop();
  const [draft, setDraft] = useState({ saved: buyNow.message, text: buyNow.message });
  if (draft.saved !== buyNow.message) setDraft({ saved: buyNow.message, text: buyNow.message });

  const [promoDraft, setPromoDraft] = useState({ saved: promo, text: promo });
  if (promoDraft.saved !== promo) setPromoDraft({ saved: promo, text: promo });

  const [keyText, setKeyText] = useState('');
  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' });
  const [passBusy, setPassBusy] = useState(false);

  const message = draft.text;
  const setMessage = (text) => setDraft((prev) => ({ ...prev, text }));

  const label = message.trim() || DEFAULT_LABEL;
  const savedLabel = buyNow.message.trim() || DEFAULT_LABEL;
  const dirty = message !== buyNow.message;

  const p = promoDraft.text;
  const setPromoField = (key) => (e) =>
    setPromoDraft((prev) => ({ ...prev, text: { ...prev.text, [key]: e.target.value } }));
  const promoDirty = PROMO_FIELDS.some((key) => p[key] !== promo[key]);

  const keyDirty = keyText.trim().length > 0;

  const toggle = async () => {
    const ok = await setBuyNow({ enabled: !buyNow.enabled });
    if (ok) pushToast(buyNow.enabled ? '“এখনই কিনুন” বাটন বন্ধ' : '“এখনই কিনুন” বাটন চালু');
  };

  const togglePromo = async () => {
    const ok = await setPromo({ enabled: !promo.enabled });
    if (ok) pushToast(promo.enabled ? 'প্রোমো ব্যানার লুকানো হয়েছে' : 'প্রোমো ব্যানার চালু হয়েছে');
  };

  const save = async (e) => {
    e.preventDefault();
    const ok = await setBuyNow({ message: message.trim() });
    if (ok) pushToast(message.trim() ? 'কাস্টম মেসেজ সেভ হয়েছে' : 'ডিফল্ট লেখায় ফিরেছে');
  };

  const savePromo = async (e) => {
    e.preventDefault();
    const to = p.ctaTo.trim();
    if (to && !to.startsWith('/')) {
      pushToast('লিংক “/” দিয়ে শুরু করুন', 'error');
      return;
    }
    const ok = await setPromo({
      kicker: p.kicker.trim(),
      title: p.title.trim(),
      desc: p.desc.trim(),
      code: p.code.trim().toUpperCase(),
      ctaLabel: p.ctaLabel.trim(),
      ctaTo: to,
    });
    if (ok) pushToast('প্রোমো ব্যানার সেভ হয়েছে');
  };

  const reset = async () => {
    const ok = await resetSettings();
    if (ok) pushToast('সেটিংস ডিফল্টে ফিরেছে');
  };

  const saveKey = async (e) => {
    e.preventDefault();
    const ok = await setImgbbKey(keyText.trim());
    if (ok) {
      setKeyText('');
      pushToast('ImgBB key সেভ হয়েছে');
    }
  };

  const clearKey = async () => {
    const ok = await setImgbbKey('');
    if (ok) pushToast('ImgBB key সরানো হয়েছে');
  };

  const changePass = async (e) => {
    e.preventDefault();
    if (passForm.next.length < 8) {
      pushToast('নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষর দিন', 'error');
      return;
    }
    if (passForm.next !== passForm.confirm) {
      pushToast('নতুন পাসওয়ার্ড দুইবার একই লিখুন', 'error');
      return;
    }
    setPassBusy(true);
    try {
      await changePassword(passForm.current, passForm.next);
      setPassForm({ current: '', next: '', confirm: '' });
      pushToast('পাসওয়ার্ড বদলানো হয়েছে');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setPassBusy(false);
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <div>
          <h2>স্টোর সেটিংস</h2>
          <p>প্রোডাক্ট পেজের অর্ডার বাটন ও হোমপেজের প্রোমো ব্যানার এখান থেকে নিয়ন্ত্রণ করুন।</p>
        </div>
        <div className="adm-page-actions">
          <button type="button" className="adm-btn ghost sm" onClick={reset}>
            ডিফল্টে ফিরান
          </button>
        </div>
      </div>

      <div className="adm-set-grid">
        <form className="adm-card adm-set-card" onSubmit={save}>
          <div className="adm-set-head">
            <span className="adm-set-ic">
              <IconCart />
            </span>
            <div>
              <h3>“এখনই কিনুন” বাটন</h3>
              <p>প্রতিটি প্রোডাক্ট পেজে “কার্টে যোগ করুন” বাটনের নিচে দেখায়। বন্ধ করলে সেখানে আপনার মেসেজ দেখাবে।</p>
            </div>
          </div>

          <div className="adm-set-row">
            <div>
              <b>বাটন দেখান</b>
              <small>{buyNow.enabled ? 'সাইটে বাটনটি চালু আছে' : 'সাইটে বাটনটি বন্ধ আছে'}</small>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={buyNow.enabled}
              aria-label="এখনই কিনুন বাটন"
              className={`adm-switch${buyNow.enabled ? ' on' : ''}`}
              onClick={toggle}
            >
              <span />
            </button>
          </div>

          <label className="adm-field">
            <span>বাটনের লেখা / মেসেজ</span>
            <input
              className="adm-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={48}
              placeholder={DEFAULT_LABEL}
              aria-label="বাটনের লেখা"
            />
            <small className="adm-hint">
              খালি রাখলে “{DEFAULT_LABEL} — ৳দাম” দেখাবে। নিজের লেখা দিলে বাটনে সেটাই বসবে, বাটন বন্ধ থাকলে জায়গাটায়
              মেসেজ হিসেবে দেখাবে।
            </small>
          </label>

          <div className="adm-set-foot">
            <button type="submit" className="adm-btn primary sm" disabled={!dirty}>
              <IconCheck /> সেভ করুন
            </button>
          </div>

          <div className="adm-set-preview">
            <span className="adm-set-preview-label">লাইভ প্রিভিউ</span>
            <div className="adm-set-preview-stage">
              {buyNow.enabled ? (
                <span className="adm-set-cta">{label} — {formatTaka(900)}</span>
              ) : message.trim() ? (
                <span className="adm-set-cta note">{message.trim()}</span>
              ) : (
                <span className="adm-set-empty">বাটন বন্ধ · কোনো মেসেজ নেই</span>
              )}
            </div>
            <small className="adm-hint">
              {dirty ? `সেভ করলে সাইটে “${label}” দেখাবে` : `সাইটে এখন “${savedLabel}” দেখাচ্ছে`}
            </small>
          </div>
        </form>

        <div className="adm-card adm-set-tip">
          <IconSettings />
          <h4>টিপস</h4>
          <p>
            “কার্টে যোগ করুন” বাটন সব সময় থাকবে, তাই বন্ধ করলেও অর্ডার নেওয়া বন্ধ হবে না। শুধু এক ক্লিকে চেকআউটের
            শর্টকাট বাটনটি লুকাবে।
          </p>
        </div>
      </div>

      <form className="adm-card adm-set-card adm-set-promo" onSubmit={savePromo}>
        <div className="adm-set-head">
          <span className="adm-set-ic">
            <IconTag />
          </span>
          <div>
            <h3>প্রোমো ব্যানার (কুপন)</h3>
            <p>হোমপেজে হিরোর নিচের অফার ব্যানার। লেখা বদলান, কুপন কোড ঠিক করুন, বা পুরোটা লুকিয়ে রাখুন।</p>
          </div>
        </div>

        <div className="adm-set-row">
          <div>
            <b>ব্যানার দেখান</b>
            <small>{promo.enabled ? 'সাইটে ব্যানারটি চালু আছে' : 'সাইটে ব্যানারটি লুকানো আছে'}</small>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={promo.enabled}
            aria-label="প্রোমো ব্যানার"
            className={`adm-switch${promo.enabled ? ' on' : ''}`}
            onClick={togglePromo}
          >
            <span />
          </button>
        </div>

        <div className="adm-set-fields">
          <label className="adm-field">
            <span>ছোট লেবেল</span>
            <input
              className="adm-input"
              value={p.kicker}
              onChange={setPromoField('kicker')}
              maxLength={24}
              placeholder="আজকের অফার"
            />
          </label>
          <label className="adm-field">
            <span>কুপন কোড</span>
            <input
              className="adm-input adm-code-input"
              value={p.code}
              onChange={setPromoField('code')}
              maxLength={12}
              autoCapitalize="characters"
              placeholder="HBD10"
            />
          </label>
          <label className="adm-field span-2">
            <span>শিরোনাম</span>
            <input
              className="adm-input"
              value={p.title}
              onChange={setPromoField('title')}
              maxLength={64}
              placeholder="প্রতিটি জন্মদিনের কেকে ১০% ছাড়"
            />
          </label>
          <label className="adm-field span-2">
            <span>বর্ণনা</span>
            <input
              className="adm-input"
              value={p.desc}
              onChange={setPromoField('desc')}
              maxLength={100}
              placeholder="চেকআউটে কোড ব্যবহার করুন — সীমিত সময়ের জন্য।"
            />
          </label>
          <label className="adm-field">
            <span>বাটনের লেখা</span>
            <input
              className="adm-input"
              value={p.ctaLabel}
              onChange={setPromoField('ctaLabel')}
              maxLength={24}
              placeholder="অফার দেখুন"
            />
          </label>
          <label className="adm-field">
            <span>বাটনের লিংক</span>
            <input
              className="adm-input"
              value={p.ctaTo}
              onChange={setPromoField('ctaTo')}
              maxLength={80}
              placeholder="/shop?cat=birthday"
            />
          </label>
        </div>

        <small className="adm-hint">
          কোড সেভ হলে চেকআউটেও ওই কোডই কাজ করবে (১০% ছাড়)। লেবেল, শিরোনাম, বর্ণনা বা বাটনের লেখা—যেকোনোটা খালি রাখলে
          সেই অংশটুকু ব্যানারে দেখাবে না।
        </small>

        <div className="adm-set-foot">
          <button type="submit" className="adm-btn primary sm" disabled={!promoDirty}>
            <IconCheck /> সেভ করুন
          </button>
        </div>

        <div className="adm-set-preview">
          <span className="adm-set-preview-label">লাইভ প্রিভিউ</span>
          <div className={`adm-promo-preview${promo.enabled ? '' : ' off'}`}>
            <div>
              {p.kicker.trim() && <span className="adm-promo-kicker">{p.kicker}</span>}
              {p.title.trim() && <b>{p.title}</b>}
              {p.desc.trim() && <small>{p.desc}</small>}
            </div>
            <div className="adm-promo-right">
              {p.code.trim() && <span className="adm-promo-code">{p.code.toUpperCase()}</span>}
              {p.ctaLabel.trim() && <span className="adm-promo-btn">{p.ctaLabel}</span>}
            </div>
          </div>
          <small className="adm-hint">
            {!promo.enabled
              ? 'ব্যানার বন্ধ · সাইটে দেখানো হচ্ছে না'
              : promoDirty
                ? 'সেভ করলে সাইটে এই লেখা দেখাবে'
                : 'সাইটে এখন এই ব্যানারটাই দেখাচ্ছে'}
          </small>
        </div>
      </form>

      <form className="adm-card adm-set-card adm-set-host" onSubmit={saveKey}>
        <div className="adm-set-head">
          <span className="adm-set-ic">
            <IconImage />
          </span>
          <div>
            <h3>ইমেজ হোস্টিং (ImgBB)</h3>
            <p>
              অ্যাডমিন থেকে ছবি আপলোড করলে সরাসরি ImgBB-তে যাবে আর ফিরে আসবে i.ibb.co লিংক — তাই ছবি যেকোনো
              হোস্টে বা ডিভাইসে দেখাবে।
            </p>
          </div>
        </div>

        <div className="adm-set-row">
          <div>
            <b>ImgBB API key</b>
            <small>
              {imgbbKeySet
                ? 'সেট আছে — ছবি আপলোড সরাসরি ImgBB-তে যাবে'
                : 'সেট নেই — ছবি আপলোড করতে আগে key সেভ করুন'}
            </small>
          </div>
          <a className="adm-btn ghost sm" href="https://api.imgbb.com/" target="_blank" rel="noreferrer">
            key নিন
          </a>
        </div>

        <label className="adm-field">
          <span>নতুন API key</span>
          <input
            className="adm-input adm-key-input"
            value={keyText}
            onChange={(e) => setKeyText(e.target.value)}
            placeholder={imgbbKeySet ? 'নতুন key দিলে পুরোনোটা বদলে যাবে' : 'ImgBB API key পেস্ট করুন'}
            autoComplete="off"
            spellCheck={false}
            aria-label="ImgBB API key"
          />
          <small className="adm-hint">
            key সার্ভারে এনক্রিপ্টেড স্টোরেজে থাকে — ব্রাউজারে বা গিটহাবে যায় না। সেভ করা key আবার দেখানো হয় না।
          </small>
        </label>

        <div className="adm-set-foot">
          <button type="submit" className="adm-btn primary sm" disabled={!keyDirty}>
            <IconCheck /> সেভ করুন
          </button>
          {imgbbKeySet && (
            <button type="button" className="adm-btn ghost sm" onClick={clearKey}>
              key মুছুন
            </button>
          )}
        </div>
      </form>

      <form className="adm-card adm-set-card" onSubmit={changePass}>
        <div className="adm-set-head">
          <span className="adm-set-ic">
            <IconShield />
          </span>
          <div>
            <h3>অ্যাডমিন পাসওয়ার্ড</h3>
            <p>পাসওয়ার্ড বদলালে অন্য সব ডিভাইসের লগইন সেশন বন্ধ হয়ে যাবে।</p>
          </div>
        </div>

        <label className="adm-field">
          <span>বর্তমান পাসওয়ার্ড</span>
          <input
            className="adm-input"
            type="password"
            value={passForm.current}
            onChange={(e) => setPassForm((prev) => ({ ...prev, current: e.target.value }))}
            autoComplete="current-password"
          />
        </label>
        <label className="adm-field">
          <span>নতুন পাসওয়ার্ড</span>
          <input
            className="adm-input"
            type="password"
            value={passForm.next}
            onChange={(e) => setPassForm((prev) => ({ ...prev, next: e.target.value }))}
            autoComplete="new-password"
            placeholder="কমপক্ষে ৮ অক্ষর"
          />
        </label>
        <label className="adm-field">
          <span>নতুন পাসওয়ার্ড আবার</span>
          <input
            className="adm-input"
            type="password"
            value={passForm.confirm}
            onChange={(e) => setPassForm((prev) => ({ ...prev, confirm: e.target.value }))}
            autoComplete="new-password"
          />
        </label>

        <div className="adm-set-foot">
          <button
            type="submit"
            className="adm-btn primary sm"
            disabled={passBusy || !passForm.current || !passForm.next}
          >
            <IconCheck /> {passBusy ? 'বদলানো হচ্ছে…' : 'পাসওয়ার্ড বদলান'}
          </button>
        </div>
      </form>
    </div>
  );
}
