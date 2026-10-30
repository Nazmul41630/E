import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useCatalog } from '../context/CatalogContext';
import { useSocial } from '../context/SocialContext';
import { formatTaka } from '../data/products';
import {
  IconCart,
  IconChevron,
  IconClose,
  IconSearch,
  IconUser,
  IconCake,
} from './Icons';
import { dprSet, thumb } from '../utils/image';

const moreLinks = [
  { label: 'Offers', to: '/shop?sort=discount' },
  { label: 'My Orders', to: '/orders' },
  { label: 'Delivery & Returns', to: '/#delivery' },
];

export default function Header() {
  const { cartCount, setCartOpen } = useShop();
  const { products, categories } = useCatalog();
  const { whatsappLabel, whatsappTel } = useSocial();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const moreRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => {
        const cat = categories.find((c) => c.slug === p.category);
        return `${p.name} ${p.bn} ${cat?.name}`.toLowerCase().includes(q);
      })
      .slice(0, 5);
  }, [query, products, categories]);

  const navLinks = useMemo(
    () => [
      { label: 'All Cakes', to: '/shop' },
      ...categories.map((c) => ({ label: c.name, to: `/shop?cat=${c.slug}` })),
    ],
    [categories],
  );

  useEffect(() => {
    const onPointer = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMoreOpen(false);
        setFocused(false);
        setMobileSearch(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setFocused(false);
    setMobileSearch(false);
    navigate(`/shop?q=${encodeURIComponent(q)}`);
  };

  const openProduct = (slug) => {
    setQuery('');
    setFocused(false);
    setMobileSearch(false);
    navigate(`/product/${slug}`);
  };

  const searchPanel = focused && query.trim() && (
    <div className="search-panel" role="listbox">
      {results.length === 0 ? (
        <p className="search-empty">“{query}” পাওয়া যায়নি। অন্য নাম লিখুন।</p>
      ) : (
        results.map((p) => (
          <button
            key={p.id}
            type="button"
            className="search-hit"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => openProduct(p.slug)}
            role="option"
            aria-selected="false"
          >
            <img src={thumb(p.image, 240)} srcSet={dprSet(p.image, 240, 480)} alt="" loading="lazy" decoding="async" />
            <span>
              <strong>{p.name}</strong>
              <small>{p.bn}</small>
            </span>
            <b>{formatTaka(p.price)}</b>
          </button>
        ))
      )}
      <button type="submit" className="search-all">
        সব রেজাল্ট দেখুন “{query}” <span>↵</span>
      </button>
    </div>
  );

  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <p>
            <span className="dot" /> ঢাকায় ২ ঘণ্টায় ডেলিভারি
          </p>
          <p className="topbar-mid">২৫০০৳+ অর্ডারে ফ্রি ডেলিভারি · ১০০% হালাল উপকরণ</p>
          <p>
            অর্ডার হটলাইন:{' '}
            <a href={`tel:${whatsappTel || '+8801700112233'}`}>{whatsappLabel || '01700-112233'}</a>
          </p>
        </div>
      </div>

      <header className="site-header">
        <div className="container header-main">
          <Link to="/" className="brand" aria-label="CakeHaus BD হোম" onClick={() => setMobileSearch(false)}>
            <span className="brand-mark">
              <IconCake />
            </span>
            <span className="brand-text">
              Cake<span>Haus</span>
              <small>BD</small>
            </span>
          </Link>

          <form className={`search ${mobileSearch ? 'is-mobile-open' : ''}`} onSubmit={submitSearch} role="search">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 120)}
              placeholder="কেক খুঁজুন — চকলেট, চিজকেক, কাপকেক..."
              aria-label="কেক সার্চ করুন"
            />
            <button type="submit" aria-label="সার্চ">
              <IconSearch />
            </button>
            {searchPanel}
          </form>

          <div className="header-actions">
            <button
              type="button"
              className="icon-btn search-trigger"
              onClick={() => setMobileSearch((v) => !v)}
              aria-label="সার্চ খুলুন"
            >
              {mobileSearch ? <IconClose /> : <IconSearch />}
            </button>
            <Link to="/orders" className="icon-btn account-btn" aria-label="আমার অর্ডার">
              <IconUser />
              <span>Account</span>
            </Link>
            <button
              type="button"
              className="icon-btn cart-btn"
              onClick={() => setCartOpen(true)}
              aria-label={`কার্ট, ${cartCount} আইটেম`}
            >
              <IconCart />
              <span className="cart-label">Cart</span>
              {cartCount > 0 && <b className="cart-badge">{cartCount}</b>}
            </button>
          </div>
        </div>

        <div className="nav-wrap">
          <div className="container nav-scroll">
            <nav aria-label="ক্যাটাগরি নেভিগেশন">
              {navLinks.map((link) => {
                const currentCat = new URLSearchParams(location.search).get('cat');
                const targetCat = new URLSearchParams(link.to.split('?')[1] || '').get('cat');
                const active =
                  location.pathname === '/shop' && (targetCat ? currentCat === targetCat : !currentCat && !location.search.includes('q='));
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`nav-link${active ? ' active' : ''}`}
                    onClick={() => setMobileSearch(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="more-wrap" ref={moreRef}>
              <button
                type="button"
                className={`nav-link more-btn ${moreOpen ? 'open' : ''}`}
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
              >
                আরও <IconChevron />
              </button>
              {moreOpen && (
                <div className="more-menu">
                  {moreLinks.map((l) => (
                    <Link key={l.label} to={l.to} onClick={() => setMoreOpen(false)}>
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export function MobileTabBar() {
  const { cartCount, setCartOpen } = useShop();
  const location = useLocation();
  const onShop = location.pathname.startsWith('/shop') || location.pathname.startsWith('/product');
  const onOrders = location.pathname.startsWith('/orders');
  return (
    <nav className="tabbar" aria-label="মোবাইল নেভিগেশন">
      <Link to="/" className={location.pathname === '/' ? 'on' : ''}>
        <IconCake />
        <span>হোম</span>
      </Link>
      <Link to="/shop" className={onShop ? 'on' : ''}>
        <IconSearch />
        <span>শপ</span>
      </Link>
      <button type="button" onClick={() => setCartOpen(true)} className={cartCount ? 'has-count' : ''}>
        <IconCart />
        <span>কার্ট</span>
        {cartCount > 0 && <b>{cartCount}</b>}
      </button>
      <Link to="/orders" className={onOrders ? 'on' : ''}>
        <IconUser />
        <span>অর্ডার</span>
      </Link>
    </nav>
  );
}
