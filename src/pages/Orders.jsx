import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useCatalog } from '../context/CatalogContext';
import { formatTaka } from '../data/products';
import { formatDeliveryDate } from '../data/orders';
import { IconCart, IconSearch, IconTruck } from '../components/Icons';
import OrderStatus, { StatusChip } from '../components/OrderStatus';
import { dprSet, thumb } from '../utils/image';

export default function Orders() {
  const { orders, addToCart, pushToast, lookupPhone, fetchOrders, ordersBusy, ordersError } = useShop();
  const { products } = useCatalog();
  const [phone, setPhone] = useState(lookupPhone);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current || !lookupPhone) return;
    didFetch.current = true;
    fetchOrders(lookupPhone).catch(() => {});
  }, [lookupPhone, fetchOrders]);

  const lookup = async (e) => {
    e.preventDefault();
    try {
      const list = await fetchOrders(phone);
      if (list.length === 0) pushToast('এই নম্বরে কোনো অর্ডার পাওয়া যায়নি', 'error');
    } catch {
      /* error state already set */
    }
  };

  const reorder = (order) => {
    order.items.forEach((item) => {
      const product = products.find((p) => p.id === item.id);
      if (product) {
        addToCart(product, {
          qty: item.qty,
          sizeIndex: item.sizeIndex || 0,
          unitPrice: item.unitPrice,
          note: item.note || '',
        });
      }
    });
    pushToast('আইটেমগুলো আবার কার্টে যোগ হয়েছে');
  };

  return (
    <main className="orders-page">
      <div className="container">
        <nav className="crumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <span>My Orders</span>
        </nav>
        <h1 className="page-title">আমার অর্ডার</h1>
        <p className="page-sub">মোবাইল নম্বর দিয়ে আপনার সব অর্ডার দেখুন — স্ট্যাটাস সবসময় আপডেট থাকে।</p>

        <form className="order-lookup" onSubmit={lookup}>
          <label>
            <span>ডেলিভারির মোবাইল নম্বর</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              inputMode="numeric"
              autoComplete="tel"
            />
          </label>
          <button type="submit" className="btn primary" disabled={ordersBusy}>
            <IconSearch /> {ordersBusy ? 'খোঁজা হচ্ছে…' : 'অর্ডার খুঁজুন'}
          </button>
        </form>

        {ordersError && (
          <p className="order-lookup-error" role="alert">
            {ordersError}
          </p>
        )}

        {orders.length === 0 ? (
          <div className="checkout-empty">
            <span className="empty-icon">
              <IconTruck />
            </span>
            <h2>{lookupPhone ? 'এই নম্বরে কোনো অর্ডার নেই' : 'এখনও কোনো অর্ডার দেখানো হয়নি'}</h2>
            <p>{lookupPhone ? 'অন্য নম্বর দিয়ে খুঁজুন অথবা নতুন অর্ডার করুন।' : 'অর্ডার করার সময় দেওয়া মোবাইল নম্বর উপরে লিখুন।'}</p>
            <Link to="/shop" className="btn primary">
              কেক দেখুন
            </Link>
          </div>
        ) : (
          <div className="order-list">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
                <header>
                  <div>
                    <h3>#{order.id}</h3>
                    <p>
                      {new Date(order.placedAt).toLocaleDateString('bn-BD', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {' · '}
                      {order.items.reduce((s, i) => s + i.qty, 0)} আইটেম
                    </p>
                  </div>
                  <StatusChip status={order.status} />
                </header>
                <OrderStatus status={order.status} />
                <div className="order-mid">
                  <div className="order-thumbs">
                    {order.items.slice(0, 4).map((item) => (
                      <img key={item.key} src={thumb(item.image, 240)} srcSet={dprSet(item.image, 240, 480)} alt={item.name} title={item.name} decoding="async" />
                    ))}
                    {order.items.length > 4 && <span>+{order.items.length - 4}</span>}
                  </div>
                  <div className="order-meta">
                    <p>
                      ডেলিভারি: <b>{formatDeliveryDate(order.customer.date)}</b> · {order.customer.slot}
                    </p>
                    <p>
                      {order.customer.area === 'inside' ? 'ঢাকার ভিতরে' : 'ঢাকার বাইরে'} ·{' '}
                      {order.paymentLabel}
                    </p>
                  </div>
                  <strong className="order-total">{formatTaka(order.total)}</strong>
                </div>
                <footer>
                  <Link to={`/order/${order.id}`} className="btn outline sm">
                    বিস্তারিত
                  </Link>
                  <button type="button" className="btn dark sm" onClick={() => reorder(order)}>
                    <IconCart /> আবার অর্ডার
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
