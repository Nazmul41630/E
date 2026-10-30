import { Link, useParams } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useSocial } from '../context/SocialContext';
import { formatTaka } from '../data/products';
import { formatDeliveryDate, isCancelled } from '../data/orders';
import { IconCheck, IconWhatsapp } from '../components/Icons';
import OrderStatus from '../components/OrderStatus';
import { dprSet, thumb } from '../utils/image';

export default function Success() {
  const { id } = useParams();
  const { orders } = useShop();
  const { whatsappHref, whatsappLabel } = useSocial();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <main className="container checkout-empty">
        <h1>অর্ডারটি পাওয়া যায়নি</h1>
        <p>আপনার অর্ডার হিস্ট্রি দেখুন অথবা নতুন করে অর্ডার করুন।</p>
        <div className="btn-row">
          <Link to="/orders" className="btn outline">
            আমার অর্ডার
          </Link>
          <Link to="/shop" className="btn primary">
            কেক দেখুন
          </Link>
        </div>
      </main>
    );
  }

  const firstName = (order.customer.name || '').trim().split(/\s+/)[0] || 'বন্ধু';

  const waText = `আমার অর্ডার: ${order.id}\nনাম: ${order.customer.name}\nমোবাইল: ${order.customer.phone}\nমোট: ${formatTaka(order.total)}\nপেমেন্ট: ${order.paymentLabel}`;

  return (
    <main className="success-page">
      <div className="container success-wrap">
        <div className="success-card">
          <span className="success-check">
            <IconCheck />
          </span>
          <span className="success-kicker">{isCancelled(order.status) ? 'অর্ডার বাতিল' : 'অর্ডার কনফার্মড'}</span>
          <h1>ধন্যবাদ, {firstName}!</h1>
          {isCancelled(order.status) ? (
            <p>
              আপনার অর্ডার <b>#{order.id}</b>টি বাতিল করা হয়েছে। সহায়তা দরকার হলে {whatsappLabel || '01700-112233'}{' '}
              নম্বরে কল করুন।
            </p>
          ) : (
            <p>
              আপনার অর্ডার <b>#{order.id}</b> আমরা পেয়েছি। নিচে অর্ডারের বর্তমান অবস্থা দেখতে
              পাবেন — অ্যাডমিন আপডেট করলে এখানেই দেখা যাবে।
            </p>
          )}

          <div className="success-chips">
            <span>
              তারিখ <b>{formatDeliveryDate(order.customer.date)}</b>
            </span>
            <span>
              সময় <b>{order.customer.slot}</b>
            </span>
            <span>
              পেমেন্ট <b>{order.paymentLabel}</b>
            </span>
          </div>

          <OrderStatus status={order.status} />

          <div className="success-items">
            {order.items.map((item) => (
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

          <dl className="totals">
            <div>
              <dt>সাবটোটাল</dt>
              <dd>{formatTaka(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="discount">
                <dt>ডিসকাউন্ট</dt>
                <dd>− {formatTaka(order.discount)}</dd>
              </div>
            )}
            <div>
              <dt>ডেলিভারি</dt>
              <dd>{order.delivery === 0 ? 'ফ্রি' : formatTaka(order.delivery)}</dd>
            </div>
            <div className="grand">
              <dt>সর্বমোট</dt>
              <dd>{formatTaka(order.total)}</dd>
            </div>
          </dl>

          <p className="success-address">
            ডেলিভারি ঠিকানা: {order.customer.address}
            {order.customer.note && <> · নোট: {order.customer.note}</>}
          </p>

          <div className="btn-row">
            <a
              className="btn whatsapp"
              href={whatsappHref(waText)}
              target="_blank"
              rel="noreferrer"
            >
              <IconWhatsapp /> WhatsApp-এ অর্ডার কনফার্ম করুন
            </a>
            <Link to="/orders" className="btn outline">
              আমার অর্ডার
            </Link>
            <Link to="/shop" className="btn ghost">
              আরও কেক কিনুন
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
