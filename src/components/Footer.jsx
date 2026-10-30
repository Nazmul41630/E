import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useSocial } from '../context/SocialContext';
import SocialGlyph from './SocialGlyph';

const YEAR = new Date().getFullYear();

export default function Footer() {
  const { setCartOpen } = useShop();
  const { activeChannels, whatsappLabel, whatsappTel } = useSocial();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <img src="/images/logo-96.webp" alt="" width="46" height="46" />
            </span>
            <span className="brand-text">
              Cake<span>Haus</span>
              <small>BD</small>
            </span>
          </Link>
          <p>
            ঢাকার ফ্রেশ বেকারি — জন্মদিন, বিয়ে কিংবা যেকোনো আনন্দের মুহূর্তের জন্য হাতে বানানো কেক,
            কাপকেক আর ডেজার্ট, সারা বাংলাদেশে ডেলিভারি।
          </p>
          <div className="socials">
            {activeChannels.map((channel) => (
              <a
                key={channel.key}
                href={channel.href}
                target="_blank"
                rel="noreferrer"
                aria-label={channel.label}
              >
                <SocialGlyph channel={channel.key} />
              </a>
            ))}
          </div>
        </div>

        <div className="footer-col">
          <h4>Shop</h4>
          <Link to="/shop">All Cakes</Link>
          <Link to="/shop?cat=birthday">Birthday Cakes</Link>
          <Link to="/shop?cat=wedding">Wedding Cakes</Link>
          <Link to="/shop?cat=cupcakes">Cupcakes</Link>
          <Link to="/shop?cat=cheesecakes">Cheesecakes</Link>
          <Link to="/shop?sort=discount">Today&apos;s Offers</Link>
        </div>

        <div className="footer-col">
          <h4>Account</h4>
          <Link to="/orders">My Orders</Link>
          <button type="button" onClick={() => setCartOpen(true)}>
            My Cart
          </button>
          <Link to="/checkout">Checkout</Link>
          <Link to="/#delivery">Delivery Info</Link>
        </div>

        <div className="footer-col">
          <h4>Contact</h4>
          <p>
            House 12, Road 5, Dhanmondi,
            <br /> Dhaka 1209
          </p>
          {whatsappTel && <a href={`tel:${whatsappTel}`}>{whatsappLabel} (WhatsApp)</a>}
          <a href="tel:+8801700445566">01700-445566</a>
          <a href="mailto:hello@cakehausbd.com">hello@cakehausbd.com</a>
          <p className="muted">প্রতিদিন সকাল ৯টা – রাত ১১টা</p>
        </div>
      </div>

      <div className="container delivery-band" id="delivery">
        <p>
          Dhaka Inside <b>৳60</b>
        </p>
        <span>·</span>
        <p>
          Outside Dhaka <b>৳120</b>
        </p>
        <span>·</span>
        <p>
          Orders <b>৳2500+</b> enjoy <b>Free</b> delivery nationwide
        </p>
        <span className="delivery-tag">ক্যাশ অন ডেলিভারি</span>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>© {YEAR} CakeHaus BD — All Rights Reserved.</p>
          <p>
            <Link to="/admin" className="footer-admin">
              Admin
            </Link>{' '}
            · Made with <span>♥</span> in Dhaka
          </p>
        </div>
      </div>
    </footer>
  );
}
