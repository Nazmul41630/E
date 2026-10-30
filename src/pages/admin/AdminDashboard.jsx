import { Link } from 'react-router-dom';
import { useCatalog } from '../../context/CatalogContext';
import { useShop } from '../../context/ShopContext';
import { ORDER_STATUSES, isCancelled, statusTone } from '../../data/orders';
import { formatTaka } from '../../data/products';
import { IconArrow, IconBox, IconCart, IconCash, IconCheck, IconTrendUp } from '../../components/Icons';

const NOW = new Date();
const DAY = 24 * 60 * 60 * 1000;

function startOfDay(time) {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const TODAY_START = startOfDay(NOW.getTime());
const WEEK = Array.from({ length: 7 }, (_, i) => {
  const time = TODAY_START - (6 - i) * DAY;
  return {
    time,
    weekday: new Date(time).toLocaleDateString('bn-BD', { weekday: 'short' }),
    date: new Date(time).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' }),
  };
});

export default function AdminDashboard() {
  const { adminOrders: orders, pushToast } = useShop();
  const { products, toggleStock } = useCatalog();

  const active = orders.filter((o) => !isCancelled(o.status));
  const revenue = active.reduce((sum, o) => sum + o.total, 0);
  const avg = active.length ? Math.round(revenue / active.length) : 0;
  const cancelled = orders.length - active.length;

  const todayOrders = active.filter((o) => new Date(o.placedAt).getTime() >= TODAY_START);

  const days = WEEK.map((day) => {
    const total = active
      .filter((o) => {
        const t = new Date(o.placedAt).getTime();
        return t >= day.time && t < day.time + DAY;
      })
      .reduce((sum, o) => sum + o.total, 0);
    return { ...day, total };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.total));
  const weekTotal = days.reduce((sum, d) => sum + d.total, 0);

  const outOfStock = products.filter((p) => p.outOfStock);
  const recent = orders.slice(0, 5);

  const restock = (product) => {
    toggleStock(product.id);
    pushToast(`${product.name} আবার স্টকে যোগ হয়েছে`);
  };

  return (
    <div className="adm-page">
      <div className="adm-stats">
        <article className="adm-stat">
          <span className="adm-stat-icon orange">
            <IconCash />
          </span>
          <div>
            <small>মোট বিক্রি</small>
            <b>{formatTaka(revenue)}</b>
            <em>এভারেজ অর্ডার {formatTaka(avg)}</em>
          </div>
        </article>
        <article className="adm-stat">
          <span className="adm-stat-icon brown">
            <IconCart />
          </span>
          <div>
            <small>মোট অর্ডার</small>
            <b>{orders.length}</b>
            <em>
              {active.length} সক্রিয়{cancelled > 0 ? ` · ${cancelled} বাতিল` : ''}
            </em>
          </div>
        </article>
        <article className="adm-stat">
          <span className="adm-stat-icon green">
            <IconTrendUp />
          </span>
          <div>
            <small>আজকের অর্ডার</small>
            <b>{todayOrders.length}</b>
            <em>{formatTaka(todayOrders.reduce((s, o) => s + o.total, 0))} বিক্রি</em>
          </div>
        </article>
        <article className="adm-stat">
          <span className="adm-stat-icon blue">
            <IconBox />
          </span>
          <div>
            <small>প্রোডাক্ট</small>
            <b>{products.length}</b>
            <em className={outOfStock.length ? 'is-warn' : ''}>
              {outOfStock.length ? `${outOfStock.length} টি স্টক শেষ` : 'সব স্টকে আছে'}
            </em>
          </div>
        </article>
      </div>

      <div className="adm-grid">
        <section className="adm-card">
          <div className="adm-card-head">
            <div>
              <h2>গত ৭ দিনের বিক্রি</h2>
              <p>এই সপ্তাহে মোট {formatTaka(weekTotal)}</p>
            </div>
            <span className="adm-card-badge">৭ দিন</span>
          </div>

          <div className="adm-chart">
            {days.map((day) => (
              <div className="adm-chart-col" key={day.time}>
                <span className="adm-chart-val">{day.total > 0 ? formatTaka(day.total) : ''}</span>
                <div className="adm-chart-track">
                  <span
                    className={day.total > 0 ? 'has-value' : ''}
                    style={{ height: `${Math.max(4, (day.total / maxDay) * 100)}%` }}
                  />
                </div>
                <b>{day.weekday}</b>
                <small>{day.date}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <div>
              <h2>অর্ডার স্ট্যাটাস</h2>
              <p>কোন অর্ডার কোন ধাপে আছে</p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="adm-empty sm">
              <IconCart />
              <p>অর্ডার এলে এখানে ব্রেকডাউন দেখা যাবে।</p>
            </div>
          ) : (
            <div className="adm-status-list">
              {ORDER_STATUSES.map((status) => {
                const count = orders.filter((o) => o.status === status).length;
                return (
                  <div className="adm-status-row" key={status}>
                    <div className="adm-status-meta">
                      <span className={`adm-chip ${statusTone(status)}`}>{status}</span>
                      <b>{count}</b>
                    </div>
                    <div className="adm-status-bar">
                      <span
                        className={`tone-${statusTone(status)}`}
                        style={{ width: `${(count / orders.length) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="adm-grid">
        <section className="adm-card">
          <div className="adm-card-head">
            <div>
              <h2>সাম্প্রতিক অর্ডার</h2>
              <p>সর্বশেষ {recent.length} টি অর্ডার</p>
            </div>
            <Link to="/admin/orders" className="adm-card-link">
              সব দেখুন <IconArrow />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="adm-empty">
              <IconCart />
              <h3>এখনও কোনো অর্ডার নেই</h3>
              <p>স্টোর থেকে অর্ডার এলে এখানে সাথে সাথে দেখা যাবে।</p>
              <a href="/shop" className="adm-btn dark sm" target="_blank" rel="noreferrer">
                স্টোরে গিয়ে অর্ডার করুন
              </a>
            </div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>অর্ডার</th>
                    <th>কাস্টমার</th>
                    <th>তারিখ</th>
                    <th>টোটাল</th>
                    <th>স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <b className="adm-order-id">#{order.id}</b>
                      </td>
                      <td>
                        <div className="adm-cell-user">
                          <b>{order.customer.name}</b>
                          <small>{order.customer.phone}</small>
                        </div>
                      </td>
                      <td>
                        {new Date(order.placedAt).toLocaleDateString('bn-BD', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td>
                        <b>{formatTaka(order.total)}</b>
                      </td>
                      <td>
                        <span className={`adm-chip ${statusTone(order.status)}`}>{order.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <div>
              <h2>স্টক অ্যালার্ট</h2>
              <p>{outOfStock.length ? `${outOfStock.length} টি প্রোডাক্ট শেষ` : 'সব প্রোডাক্ট স্টকে আছে'}</p>
            </div>
            <Link to="/admin/products" className="adm-card-link">
              ম্যানেজ <IconArrow />
            </Link>
          </div>

          {outOfStock.length === 0 ? (
            <div className="adm-stock-ok">
              <span>
                <IconCheck />
              </span>
              <p>দুর্দান্ত — সব কেকই অর্ডার নিচ্ছে।</p>
            </div>
          ) : (
            <div className="adm-stock-list">
              {outOfStock.map((product) => (
                <div className="adm-stock-row" key={product.id}>
                  <img src={product.image} alt="" />
                  <div>
                    <b>{product.name}</b>
                    <small>{formatTaka(product.price)}</small>
                  </div>
                  <button type="button" className="adm-btn outline sm" onClick={() => restock(product)}>
                    স্টকে আনুন
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
