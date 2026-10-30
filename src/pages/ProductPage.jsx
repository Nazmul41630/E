import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ProductCard, { Stars } from '../components/ProductCard';
import { IconCart, IconCash, IconLeaf, IconTruck, IconWhatsapp } from '../components/Icons';
import { useShop } from '../context/ShopContext';
import { useCatalog } from '../context/CatalogContext';
import { useSocial } from '../context/SocialContext';
import { useSettings } from '../context/SettingsContext';
import { discountPercent, formatTaka, sizeFactors } from '../data/products';

export default function ProductPage() {
  const { slug } = useParams();
  const { products, categories } = useCatalog();
  const product = products.find((p) => p.slug === slug);
  const { addToCart } = useShop();
  const { whatsappHref } = useSocial();
  const { buyNow: buyNowCta } = useSettings();
  const navigate = useNavigate();
  const [sizeIndex, setSizeIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState('');

  const related = useMemo(
    () => (product ? products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4) : []),
    [product, products],
  );

  if (!product) {
    return (
      <main className="container not-found">
        <h1>কেকটি খুঁজে পাওয়া যায়নি</h1>
        <p>সম্ভবত লিংকটি পুরোনো।</p>
        <Link to="/shop" className="btn primary">
          সব কেক দেখুন
        </Link>
      </main>
    );
  }

  const category = categories.find((c) => c.slug === product.category);
  const factor = product.sizes ? sizeFactors[sizeIndex].factor : 1;
  const unitPrice = Math.round((product.price * factor) / 10) * 10;
  const off = discountPercent(product);
  const oldUnit = product.oldPrice ? Math.round((product.oldPrice * factor) / 10) * 10 : null;

  const add = () => {
    addToCart(product, { qty, sizeIndex: product.sizes ? sizeIndex : 0, unitPrice, note: message.trim() });
  };

  const buyNow = () => {
    add();
    navigate('/checkout');
  };

  return (
    <main className="product-page">
      <div className="container">
        <nav className="crumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to={`/shop?cat=${product.category}`}>{category?.name}</Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        <div className="product-layout">
          <div className="product-media">
            <div className="product-img">
              <img src={product.image} alt={product.name} fetchPriority="high" decoding="async" />
              {off > 0 && <span className="badge-off big">-{off}%</span>}
              {product.badge && <span className="badge-tag big">{product.badge}</span>}
              {product.outOfStock && <span className="stock-label big">Out of Stock</span>}
            </div>
            <div className="media-notes">
              <span>
                <IconLeaf /> ১০০% ফ্রেশ ও হালাল
              </span>
              <span>
                <IconTruck /> ২ ঘণ্টায় ডেলিভারি
              </span>
              <span>
                <IconCash /> ক্যাশ অন ডেলিভারি
              </span>
            </div>
          </div>

          <div className="product-info">
            <Link to={`/shop?cat=${product.category}`} className="product-cat">
              {category?.name}
            </Link>
            <h1>{product.name}</h1>
            <p className="product-bn">{product.bn}</p>

            <div className="product-rating">
              <Stars rating={product.rating} reviews={product.reviews} />
              <span className="dot-sep">·</span>
              <span className="stock-ok">{product.outOfStock ? 'স্টকে নেই' : 'স্টকে আছে'}</span>
            </div>

            <div className="product-price">
              <strong>{formatTaka(unitPrice)}</strong>
              {oldUnit && <del>{formatTaka(oldUnit)}</del>}
              {off > 0 && <span className="save-tag">সেভ {formatTaka((oldUnit || unitPrice) - unitPrice)}</span>}
            </div>

            <p className="product-desc">{product.desc}</p>

            {product.sizes && (
              <div className="option-block">
                <h4>সাইজ বেছে নিন</h4>
                <div className="size-options">
                  {sizeFactors.map((s, i) => (
                    <button
                      key={s.label}
                      type="button"
                      className={sizeIndex === i ? 'on' : ''}
                      onClick={() => setSizeIndex(i)}
                    >
                      <strong>{s.label}</strong>
                      <small>{s.note}</small>
                      <b>{formatTaka(Math.round((product.price * s.factor) / 10) * 10)}</b>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="option-block">
              <h4>
                কেকে লেখা <span>(ঐচ্ছিক)</span>
              </h4>
              <input
                type="text"
                maxLength={40}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="যেমন: Happy Birthday Rahim"
                className="message-input"
              />
              <small className="hint">{message.length}/40 অক্ষর · চকলেট দিয়ে লেখা হবে</small>
            </div>

            <div className="buy-row">
              <div className="stepper big">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="কমান">
                  −
                </button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="বাড়ান">
                  +
                </button>
              </div>
              <button type="button" className="btn primary grow" disabled={product.outOfStock} onClick={add}>
                <IconCart /> কার্টে যোগ করুন
              </button>
            </div>
            {buyNowCta.enabled ? (
              <button type="button" className="btn dark block" disabled={product.outOfStock} onClick={buyNow}>
                {buyNowCta.message.trim() || 'এখনই কিনুন'} — {formatTaka(unitPrice * qty)}
              </button>
            ) : buyNowCta.message.trim() ? (
              <p className="buy-note">{buyNowCta.message}</p>
            ) : null}

            <a
              className="wa-link"
              href={whatsappHref(`আমি এই কেকটি অর্ডার করতে চাই: ${product.name}`)}
              target="_blank"
              rel="noreferrer"
            >
              <IconWhatsapp /> WhatsApp-এ অর্ডার করতে চান? মেসেজ দিন
            </a>
          </div>
        </div>

        {related.length > 0 && (
          <section className="section related">
            <div className="section-head">
              <div>
                <h2>You may also like</h2>
                <p>একই ক্যাটাগরির আরও কেক</p>
              </div>
              <Link to={`/shop?cat=${product.category}`} className="view-all">
                View All
              </Link>
            </div>
            <div className="product-grid">
              {related.map((p, i) => (
                <ProductCard product={p} key={p.id} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
