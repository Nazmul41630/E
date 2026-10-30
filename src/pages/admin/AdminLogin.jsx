import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const { login } = useAuth();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await login(user, pass);
    } catch (err) {
      setError(err.message || 'লগইন ব্যর্থ হয়েছে');
      setBusy(false);
    }
  };

  return (
    <div className="adm-login">
      <div className="adm-login-glow" aria-hidden="true" />
      <div className="adm-login-grid" aria-hidden="true" />

      <form className="adm-login-card" onSubmit={submit}>
        <Link to="/" className="adm-login-brand">
          <span className="adm-logo">
            <img src="/images/logo-96.webp" alt="" width="44" height="44" />
          </span>
          <span className="adm-login-brandtext">
            Cake<span>Haus</span>
            <small>ADMIN</small>
          </span>
        </Link>

        <h1>অ্যাডমিন লগইন</h1>
        <p className="adm-login-sub">স্টোর, অর্ডার আর প্রোডাক্ট ম্যানেজ করতে সাইন ইন করুন।</p>

        <label className="adm-field">
          <span>ইউজারনেম</span>
          <input
            className="adm-input"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="admin"
            autoComplete="username"
          />
        </label>

        <label className="adm-field">
          <span>পাসওয়ার্ড</span>
          <span className="adm-pass">
            <input
              className="adm-input"
              type={show ? 'text' : 'password'}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShow((v) => !v)}>
              {show ? 'লুকান' : 'দেখান'}
            </button>
          </span>
        </label>

        {error && (
          <p className="adm-error-text" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="adm-btn primary block" disabled={busy}>
          {busy ? 'লগইন হচ্ছে…' : 'লগইন করুন'}
        </button>

        <Link to="/" className="adm-login-back">
          ← স্টোরে ফিরে যান
        </Link>
      </form>
    </div>
  );
}
