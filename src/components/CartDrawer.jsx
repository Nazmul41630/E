import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { freeDeliveryAbove, formatTaka } from '../data/products';
import { IconCake, IconClose, IconMinus, IconPlus, IconTrash } from './Icons';
import { dprSet, thumb } from '../utils/image';

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, cartCount, cartTotal, updateQty, removeItem } = useShop();

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e) => e.key === 'Escape' && setCartOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [cartOpen, setCartOpen]);

  const remaining = Math.max(0, freeDeliveryAbove - cartTotal);

  return (
    <>
      <div className={`drawer-veil ${cartOpen ? 'show' : ''}`} onClick={() => setCartOpen(false)} />
      <aside className={`cart-drawer ${cartOpen ? 'open' : ''}`} aria-hidden={!cartOpen} aria-label="কার্ট">
        <header className="drawer-head">
          <h2>
            আপনার কার্ট {cartCount > 0 && <span>{cartCount} আইটেম</span>}
          </h2>
          <button type="button" className="icon-btn" onClick={() => setCartOpen(false)} aria-label="কার্ট বন্ধ করুন">
            <IconClose />
          </button>
        </header>

        {cart.length === 0 ? (
          <div className="cart-empty">
            <span className="empty-icon">
              <IconCake />
            </span>
            <h3>কার্ট এখন খালি</h3>
            <p>আপনার পছন্দের কেক বেছে নিন — ঢাকায় ২ ঘণ্টায় পৌঁছে যাবে।</p>
            <Link to="/shop" className="btn primary" onClick={() => setCartOpen(false)}>
              কেক দেখুন
            </Link>
          </div>
        ) : (
          <>
            <div className="drawer-items">
              {cart.map((item) => (
                <div className="cart-line" key={item.key}>
                  <img src={thumb(item.image, 240)} srcSet={dprSet(item.image, 240, 480)} alt={item.name} decoding="async" />
                  <div className="cart-line-main">
                    <Link to={`/product/${item.slug}`} onClick={() => setCartOpen(false)}>
                      {item.name}
                    </Link>
                    <small>{item.sizeLabel ? `${item.sizeLabel} · ${item.bn}` : item.bn}</small>
                    {item.note && <small className="line-note">লেখা: “{item.note}”</small>}
                    <div className="cart-line-bottom">
                      <div className="stepper">
                        <button type="button" onClick={() => updateQty(item.key, -1)} aria-label="পরিমাণ কমান">
                          <IconMinus />
                        </button>
                        <span>{item.qty}</span>
                        <button type="button" onClick={() => updateQty(item.key, 1)} aria-label="পরিমাণ বাড়ান">
                          <IconPlus />
                        </button>
                      </div>
                      <strong>{formatTaka(item.unitPrice * item.qty)}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="line-remove"
                    onClick={() => removeItem(item.key)}
                    aria-label={`${item.name} সরান`}
                  >
                    <IconTrash />
                  </button>
                </div>
              ))}
            </div>

            <footer className="drawer-foot">
              <div className="free-ship">
                {remaining > 0 ? (
                  <p>
                    আরও <b>{formatTaka(remaining)}</b> যোগ করলে ডেলিভারি ফ্রি
                  </p>
                ) : (
                  <p className="free-ok">ডেলিভারি ফ্রি — মজা করুন!</p>
                )}
                <div className="free-bar">
                  <span style={{ width: `${Math.min(100, (cartTotal / freeDeliveryAbove) * 100)}%` }} />
                </div>
              </div>
              <div className="subtotal">
                <span>সাবটোটাল</span>
                <strong>{formatTaka(cartTotal)}</strong>
              </div>
              <p className="drawer-note">ডেলিভারি চার্জ চেকআউটে যোগ হবে · ক্যাশ অন ডেলিভারি সুবিধা</p>
              <Link to="/checkout" className="btn primary block" onClick={() => setCartOpen(false)}>
                চেকআউট করুন
              </Link>
              <button type="button" className="link-btn" onClick={() => setCartOpen(false)}>
                আরও কেক দেখুন
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
