import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useSettings } from '../context/SettingsContext';
import { deliveryFees, formatTaka, freeDeliveryAbove } from '../data/products';
import { IconCash, IconCheck, IconLeaf, IconShield, IconTruck } from '../components/Icons';
import { dprSet, thumb } from '../utils/image';

const slots = ['সকাল ১০টা – দুপুর ২টা', 'দুপুর ২টা – সন্ধ্যা ৬টা', 'সন্ধ্যা ৬টা – রাত ১০টা'];
const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());

export default function Checkout() {
  const { cart, cartTotal, submitOrder, pushToast } = useShop();
  const { promo: promoBand } = useSettings();
  const promoCode = promoBand.code.trim().toUpperCase();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    area: 'inside',
    date: TODAY,
    slot: slots[0],
    payment: 'cash',
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState('');
  const [placing, setPlacing] = useState(false);

  const discount = useMemo(
    () => (promoBand.enabled && promoCode && promo === promoCode ? Math.round(cartTotal * 0.1) : 0),
    [promo, promoCode, promoBand.enabled, cartTotal],
  );
  const delivery = cartTotal >= freeDeliveryAbove || cartTotal === 0 ? 0 : deliveryFees[form.area];
  const total = Math.max(0, cartTotal - discount) + delivery;

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const applyPromo = () => {
    if (promoCode && promoInput.trim().toUpperCase() === promoCode) {
      setPromo(promoCode);
      pushToast(`${promoCode} প্রয়োগ হয়েছে — ১০% ছাড়`);
    } else {
      setPromo('');
      pushToast('কোডটি সঠিক নয়', 'error');
    }
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 3) next.name = 'পুরো নাম লিখুন';
    if (!/^01[3-9]\d{8}$/.test(form.phone.replace(/\s|-/g, ''))) next.phone = 'সঠিক মোবাইল নম্বর দিন (১১ ডিজিট)';
    if (form.address.trim().length < 10) next.address = 'বিস্তারিত ঠিকানা লিখুন (বাসা, রোড, এলাকা)';
    if (!form.date) next.date = 'ডেলিভারির তারিখ বেছে নিন';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      pushToast('ফর্মে কিছু তথ্য বাকি আছে', 'error');
      return;
    }
    setPlacing(true);
    try {
      const order = await submitOrder({
        customer: { ...form, name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() },
        items: cart.map((item) => ({
          id: item.id,
          sizeIndex: item.sizeIndex,
          qty: item.qty,
          note: item.note,
        })),
        promo,
      });
      navigate(`/order/${order.id}`);
    } catch (err) {
      pushToast(err.message || 'অর্ডার সম্পন্ন হয়নি', 'error');
      setPlacing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <main className="container checkout-empty">
        <span className="empty-icon">
          <IconTruck />
        </span>
        <h1>চেকআউটের জন্য কার্ট খালি</h1>
        <p>প্রথমে পছন্দের কেক কার্টে যোগ করুন।</p>
        <Link to="/shop" className="btn primary">
          কেক দেখুন
        </Link>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="container">
        <nav className="crumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/shop">Shop</Link>
          <span>/</span>
          <span>Checkout</span>
        </nav>
        <h1 className="page-title">চেকআউট</h1>
        <p className="page-sub">মাত্র ২ মিনিটে অর্ডার সম্পন্ন করুন — ক্যাশ অন ডেলিভারি সুবিধা।</p>

        <form onSubmit={submit} className="checkout-grid" noValidate>
          <div className="checkout-form">
            <section className="form-card">
              <h2>
                <span>১</span> ডেলিভারি তথ্য
              </h2>
              <div className="field-row">
                <label className={errors.name ? 'field invalid' : 'field'}>
                  <span>পুরো নাম *</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="যেমন: রাহিম আহমেদ"
                    autoComplete="name"
                  />
                  {errors.name && <small>{errors.name}</small>}
                </label>
                <label className={errors.phone ? 'field invalid' : 'field'}>
                  <span>মোবাইল নম্বর *</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="01XXXXXXXXX"
                    autoComplete="tel"
                    inputMode="numeric"
                  />
                  {errors.phone && <small>{errors.phone}</small>}
                </label>
              </div>
              <label className={errors.address ? 'field invalid' : 'field'}>
                <span>সম্পূর্ণ ঠিকানা *</span>
                <textarea
                  rows="3"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="বাসা/ফ্ল্যাট, রোড, এলাকা, শহর"
                  autoComplete="street-address"
                />
                {errors.address && <small>{errors.address}</small>}
              </label>

              <div className="area-options">
                <label className={form.area === 'inside' ? 'area on' : 'area'}>
                  <input
                    type="radio"
                    name="area"
                    checked={form.area === 'inside'}
                    onChange={() => set('area', 'inside')}
                  />
                  <span>
                    <b>ঢাকার ভিতরে</b>
                    <small>২ ঘণ্টায় ডেলিভারি</small>
                  </span>
                  <strong>{formatTaka(deliveryFees.inside)}</strong>
                </label>
                <label className={form.area === 'outside' ? 'area on' : 'area'}>
                  <input
                    type="radio"
                    name="area"
                    checked={form.area === 'outside'}
                    onChange={() => set('area', 'outside')}
                  />
                  <span>
                    <b>ঢাকার বাইরে</b>
                    <small>২৪ ঘণ্টায় ডেলিভারি</small>
                  </span>
                  <strong>{formatTaka(deliveryFees.outside)}</strong>
                </label>
              </div>

              <div className="field-row">
                <label className={errors.date ? 'field invalid' : 'field'}>
                  <span>ডেলিভারির তারিখ *</span>
                  <input
                    type="date"
                    value={form.date}
                    min={TODAY}
                    onChange={(e) => set('date', e.target.value)}
                  />
                  {errors.date && <small>{errors.date}</small>}
                </label>
                <label className="field">
                  <span>সময়</span>
                  <select value={form.slot} onChange={(e) => set('slot', e.target.value)}>
                    {slots.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="form-card">
              <h2>
                <span>২</span> পেমেন্ট মেথড
              </h2>
              <div className="pay-options">
                <label className={form.payment === 'cash' ? 'pay on' : 'pay'}>
                  <input
                    type="radio"
                    name="payment"
                    checked={form.payment === 'cash'}
                    onChange={() => set('payment', 'cash')}
                  />
                  <IconCash />
                  <span>
                    <b>ক্যাশ অন ডেলিভারি</b>
                    <small>কেক হাতে পেয়ে টাকা দিন</small>
                  </span>
                  <i>
                    <IconCheck />
                  </i>
                </label>
                <label className={form.payment === 'bkash' ? 'pay on' : 'pay'}>
                  <input
                    type="radio"
                    name="payment"
                    checked={form.payment === 'bkash'}
                    onChange={() => set('payment', 'bkash')}
                  />
                  <span className="bkash-logo">bKash</span>
                  <span>
                    <b>bKash</b>
                    <small>সেন্ড মানি: 01700-112233</small>
                  </span>
                  <i>
                    <IconCheck />
                  </i>
                </label>
              </div>
              {form.payment === 'bkash' && (
                <p className="pay-note">
                  অর্ডার করার পর <b>01700-112233</b> নম্বরে টাকা পাঠিয়ে ট্রানজেকশন আইডি WhatsApp-এ
                  পাঠান। অর্ডার কনফার্ম হলে ডেলিভারি হবে।
                </p>
              )}
              <label className="field">
                <span>অর্ডার নোট (ঐচ্ছিক)</span>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => set('note', e.target.value)}
                  placeholder="কেকের লেখা, ডেলিভারি নির্দেশনা..."
                />
              </label>
            </section>
          </div>

          <aside className="order-summary">
            <h2>আপনার অর্ডার</h2>
            <div className="summary-items">
              {cart.map((item) => (
                <div className="summary-line" key={item.key}>
                  <span className="qty-badge">{item.qty}</span>
                  <img src={thumb(item.image, 240)} srcSet={dprSet(item.image, 240, 480)} alt={item.name} decoding="async" />
                  <div>
                    <p>{item.name}</p>
                    <small>{item.sizeLabel || item.bn}</small>
                    {item.note && <small className="line-note">লেখা: “{item.note}”</small>}
                  </div>
                  <b>{formatTaka(item.unitPrice * item.qty)}</b>
                </div>
              ))}
            </div>

            <div className="promo-box">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="প্রোমো কোড"
                aria-label="প্রোমো কোড"
              />
              <button type="button" onClick={applyPromo}>
                প্রয়োগ
              </button>
            </div>
            {promo && <p className="promo-ok">কোড {promo} প্রয়োগ হয়েছে · ১০% ছাড়</p>}

            <dl className="totals">
              <div>
                <dt>সাবটোটাল</dt>
                <dd>{formatTaka(cartTotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="discount">
                  <dt>ডিসকাউন্ট</dt>
                  <dd>− {formatTaka(discount)}</dd>
                </div>
              )}
              <div>
                <dt>ডেলিভারি</dt>
                <dd>{delivery === 0 ? 'ফ্রি' : formatTaka(delivery)}</dd>
              </div>
              <div className="grand">
                <dt>সর্বমোট</dt>
                <dd>{formatTaka(total)}</dd>
              </div>
            </dl>

            <button type="submit" className="btn primary block lg" disabled={placing}>
              {placing ? 'অর্ডার হচ্ছে...' : `অর্ডার কনফার্ম করুন · ${formatTaka(total)}`}
            </button>
            <div className="summary-trust">
              <span>
                <IconShield /> নিরাপদ অর্ডার
              </span>
              <span>
                <IconLeaf /> ফ্রেশ গ্যারান্টি
              </span>
              <span>
                <IconTruck /> সময়মতো ডেলিভারি
              </span>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
