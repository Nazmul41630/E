import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useBanners } from '../../context/BannerContext';
import { useCatalog } from '../../context/CatalogContext';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { useSocial } from '../../context/SocialContext';
import {
  IconArrow,
  IconBox,
  IconCart,
  IconGrid,
  IconImage,
  IconLogout,
  IconSettings,
  IconShare,
  IconTag,
} from '../../components/Icons';
import AdminLogin from './AdminLogin';
import AdminBanners from './AdminBanners';
import AdminCategories from './AdminCategories';
import AdminDashboard from './AdminDashboard';
import AdminOrders from './AdminOrders';
import AdminProducts from './AdminProducts';
import AdminSettings from './AdminSettings';
import AdminSocial from './AdminSocial';
import './admin.css';

const PAGES = [
  { path: '/admin', title: 'ড্যাশবোর্ড', sub: 'বিক্রি, অর্ডার আর স্টকের এক নজরে' },
  { path: '/admin/orders', title: 'অর্ডার ম্যানেজমেন্ট', sub: 'কাস্টমার অর্ডার দেখুন ও স্ট্যাটাস আপডেট করুন' },
  { path: '/admin/products', title: 'প্রোডাক্ট ম্যানেজমেন্ট', sub: 'কেক যোগ করুন, দাম ও স্টক ঠিক করুন' },
  { path: '/admin/categories', title: 'ক্যাটাগরি ম্যানেজমেন্ট', sub: 'নতুন ক্যাটাগরি যোগ করুন, নাম-ছবি বদলান ও সাজান' },
  { path: '/admin/banners', title: 'ব্যানার ম্যানেজমেন্ট', sub: 'হোমের স্লাইডার ব্যানার যোগ, এডিট ও সাজান' },
  { path: '/admin/social', title: 'সোশ্যাল ও যোগাযোগ', sub: 'হোয়াটসঅ্যাপ, মেসেঞ্জারসহ নিজের অ্যাকাউন্ট ও নম্বর সেট করুন' },
  { path: '/admin/settings', title: 'স্টোর সেটিংস', sub: 'প্রোডাক্ট পেজের অর্ডার বাটন ও সাইটের লেখা নিয়ন্ত্রণ করুন' },
];

export default function AdminApp() {
  const [navOpen, setNavOpen] = useState(false);
  const { admin, logout } = useAuth();
  const { adminOrders, loadAdminOrders } = useShop();
  const { products, categories } = useCatalog();
  const { banners } = useBanners();
  const { activeChannels } = useSocial();
  const location = useLocation();

  useEffect(() => {
    if (admin) loadAdminOrders();
  }, [admin, loadAdminOrders]);

  if (!admin) {
    return <AdminLogin />;
  }

  const page = PAGES.find((p) => (p.path === '/admin' ? location.pathname === p.path : location.pathname.startsWith(p.path))) || PAGES[0];
  const initial = (admin.username || 'A').slice(0, 1).toUpperCase();

  const signOut = () => {
    setNavOpen(false);
    logout().catch(() => {});
  };

  return (
    <div className={`adm${navOpen ? ' is-nav-open' : ''}`}>
      {navOpen && (
        <button type="button" className="adm-overlay" aria-label="মেনু বন্ধ করুন" onClick={() => setNavOpen(false)} />
      )}

      <aside className="adm-side">
        <Link to="/admin" className="adm-side-brand" onClick={() => setNavOpen(false)}>
          <span className="adm-logo">
            <img src="/images/logo-96.webp" alt="" width="44" height="44" />
          </span>
          <span className="adm-side-brandtext">
            Cake<span>Haus</span>
            <small>ADMIN</small>
          </span>
        </Link>

        <p className="adm-side-label">ম্যানেজমেন্ট</p>
        <nav className="adm-side-nav" aria-label="অ্যাডমিন নেভিগেশন">
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'on' : '')} onClick={() => setNavOpen(false)}>
            <IconGrid />
            <span>ড্যাশবোর্ড</span>
          </NavLink>
          <NavLink to="/admin/orders" className={({ isActive }) => (isActive ? 'on' : '')} onClick={() => setNavOpen(false)}>
            <IconCart />
            <span>অর্ডার</span>
            <b className="adm-side-count">{adminOrders.length}</b>
          </NavLink>
          <NavLink to="/admin/products" className={({ isActive }) => (isActive ? 'on' : '')} onClick={() => setNavOpen(false)}>
            <IconBox />
            <span>প্রোডাক্ট</span>
            <b className="adm-side-count">{products.length}</b>
          </NavLink>
          <NavLink to="/admin/categories" className={({ isActive }) => (isActive ? 'on' : '')} onClick={() => setNavOpen(false)}>
            <IconTag />
            <span>ক্যাটাগরি</span>
            <b className="adm-side-count">{categories.length}</b>
          </NavLink>
          <NavLink to="/admin/banners" className={({ isActive }) => (isActive ? 'on' : '')} onClick={() => setNavOpen(false)}>
            <IconImage />
            <span>ব্যানার</span>
            <b className="adm-side-count">{banners.length}</b>
          </NavLink>
          <NavLink to="/admin/social" className={({ isActive }) => (isActive ? 'on' : '')} onClick={() => setNavOpen(false)}>
            <IconShare />
            <span>সোশ্যাল</span>
            <b className="adm-side-count">{activeChannels.length}</b>
          </NavLink>
          <NavLink to="/admin/settings" className={({ isActive }) => (isActive ? 'on' : '')} onClick={() => setNavOpen(false)}>
            <IconSettings />
            <span>সেটিংস</span>
          </NavLink>
        </nav>

        <div className="adm-side-tip">
          <span>লাইভ ডেমো স্টোর</span>
          <p>এখানে যা বদলাবেন, সঙ্গে সঙ্গে ওয়েবসাইটেও দেখা যাবে।</p>
          <a href="/" target="_blank" rel="noreferrer">
            সাইট দেখুন <IconArrow />
          </a>
        </div>

        <div className="adm-side-foot">
          <span className="adm-avatar">{initial}</span>
          <div>
            <b>{admin.username}</b>
            <small>Store Manager</small>
          </div>
          <button type="button" onClick={signOut} aria-label="লগআউট" title="লগআউট">
            <IconLogout />
          </button>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-top">
          <button
            type="button"
            className="adm-burger"
            onClick={() => setNavOpen((v) => !v)}
            aria-label="মেনু খুলুন"
            aria-expanded={navOpen}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="adm-top-title">
            <span className="adm-crumb">CakeHaus BD / Admin</span>
            <h1>{page.title}</h1>
            <p>{page.sub}</p>
          </div>

          <div className="adm-top-actions">
            <a href="/" className="adm-btn ghost sm" target="_blank" rel="noreferrer">
              সাইট দেখুন
            </a>
            <span className="adm-avatar">{initial}</span>
          </div>
        </header>

        <div className="adm-body">
          <Routes>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/banners" element={<AdminBanners />} />
            <Route path="/admin/social" element={<AdminSocial />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
