import { useEffect, useMemo, useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { ORDER_STATUSES, formatDeliveryDate, statusTone } from '../../data/orders';
import { formatTaka } from '../../data/products';
import { IconCart, IconClose, IconEye, IconSearch, IconTrash, IconWhatsapp } from '../../components/Icons';

function waLink(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return `https://wa.me/${digits.replace(/^0/, '88')}`;
}

export default function AdminOrders() {
  const { adminOrders: orders, updateOrderStatus, deleteOrder, pushToast } = useShop();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selected = orders.find((o) => o.id === selectedId) || null;

  useEffect(() => {
    if (!selectedId) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [selectedId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (!needle) return true;
      return `${o.id} ${o.customer.name} ${o.customer.phone} ${o.customer.address}`.toLowerCase().includes(needle);
    });
  }, [orders, filter, q]);

  const open = (id) => {
    setSelectedId(id);
    setConfirmDelete(false);
  };

  const close = () => {
    setSelectedId(null);
    setConfirmDelete(false);
  };

  const changeStatus = async (id, status) => {
    const ok = await updateOrderStatus(id, status);
    if (ok) pushToast(`#${id} স্ট্যাটাস — ${status}`);
  };

  const remove = async (id) => {
    close();
    const ok = await deleteOrder(id);
    if (ok) pushToast(`#${id} অর্ডার মুছে ফেলা হয়েছে`, 'error');
  };

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <div>
          <h2>
            সব অর্ডার <span className="adm-count">{orders.length}</span>
          </h2>
          <p>অর্ডার সার্চ করুন, স্ট্যাটাস বদলান অথবা বিস্তারিত দেখুন।</p>
        </div>
      </div>

      <div className="adm-toolbar">
        <label className="adm-search">
          <IconSearch />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="অর্ডার আইডি, নাম বা ফোন..."
            aria-label="অর্ডার সার্চ"
          />
        </label>
      </div>

      <div className="adm-tabs" role="tablist" aria-label="স্ট্যাটাস ফিল্টার">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={filter === 'all' ? 'on' : ''}
          onClick={() => setFilter('all')}
        >
          সব <b>{orders.length}</b>
        </button>
        {ORDER_STATUSES.map((status) => {
          const count = orders.filter((o) => o.status === status).length;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={filter === status}
              key={status}
              className={filter === status ? 'on' : ''}
              onClick={() => setFilter(status)}
            >
              {status} <b>{count}</b>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="adm-card">
          <div className="adm-empty">
            <IconCart />
            <h3>{orders.length === 0 ? 'এখনও কোনো অর্ডার নেই' : 'এই ফিল্টারে অর্ডার নেই'}</h3>
            <p>
              {orders.length === 0
                ? 'স্টোর থেকে কেউ অর্ডার করলে এখানে দেখা যাবে।'
                : 'অন্য স্ট্যাটাস বা সার্চ বদলে দেখুন।'}
            </p>
            {orders.length === 0 && (
              <a href="/shop" className="adm-btn dark sm" target="_blank" rel="noreferrer">
                স্টোরে গিয়ে অর্ডার করুন
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="adm-card flush">
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>অর্ডার</th>
                  <th>কাস্টমার</th>
                  <th>ডেলিভারি</th>
                  <th>আইটেম</th>
                  <th>টোটাল</th>
                  <th>স্ট্যাটাস</th>
                  <th aria-label="অ্যাকশন" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const qty = order.items.reduce((s, i) => s + i.qty, 0);
                  return (
                    <tr key={order.id}>
                      <td>
                        <b className="adm-order-id">#{order.id}</b>
                        <small className="adm-cell-sub">
                          {new Date(order.placedAt).toLocaleDateString('bn-BD', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </small>
                      </td>
                      <td>
                        <div className="adm-cell-user">
                          <b>{order.customer.name}</b>
                          <small>{order.customer.phone}</small>
                        </div>
                      </td>
                      <td>
                        <small className="adm-cell-sub">
                          {formatDeliveryDate(order.customer.date)} · {order.customer.slot}
                        </small>
                        <small className="adm-cell-sub">
                          {order.customer.area === 'inside' ? 'ঢাকার ভিতরে' : 'ঢাকার বাইরে'} · {order.paymentLabel}
                        </small>
                      </td>
                      <td>
                        <div className="adm-items-cell">
                          <span>{qty} টি</span>
                          {order.items[0] && <img src={order.items[0].image} alt="" />}
                        </div>
                      </td>
                      <td>
                        <b>{formatTaka(order.total)}</b>
                      </td>
                      <td>
                        <select
                          className={`adm-status-select tone-${statusTone(order.status)}`}
                          value={order.status}
                          onChange={(e) => changeStatus(order.id, e.target.value)}
                          aria-label={`#${order.id} স্ট্যাটাস`}
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="adm-icon-btn"
                          onClick={() => open(order.id)}
                          aria-label={`#${order.id} বিস্তারিত`}
                          title="বিস্তারিত"
                        >
                          <IconEye />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="adm-modal" role="dialog" aria-modal="true" aria-label={`অর্ডার #${selected.id}`}>
          <button type="button" className="adm-modal-veil" aria-label="বন্ধ করুন" onClick={close} />
          <div className="adm-modal-card wide">
            <div className="adm-modal-head">
              <div>
                <span className={`adm-chip ${statusTone(selected.status)}`}>{selected.status}</span>
                <h2>অর্ডার #{selected.id}</h2>
                <p>
                  {new Date(selected.placedAt).toLocaleString('bn-BD', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <button type="button" className="adm-icon-btn" onClick={close} aria-label="বন্ধ করুন">
                <IconClose />
              </button>
            </div>

            <div className="adm-modal-body">
              <div className="adm-detail-grid">
                <div className="adm-detail-box">
                  <span>কাস্টমার</span>
                  <b>{selected.customer.name}</b>
                  <a href={`tel:${selected.customer.phone}`}>{selected.customer.phone}</a>
                  <p>{selected.customer.address}</p>
                </div>
                <div className="adm-detail-box">
                  <span>ডেলিভারি</span>
                  <b>{formatDeliveryDate(selected.customer.date)}</b>
                  <p>{selected.customer.slot}</p>
                  <p>
                    {selected.customer.area === 'inside' ? 'ঢাকার ভিতরে' : 'ঢাকার বাইরে'} ·{' '}
                    {selected.paymentLabel}
                  </p>
                </div>
              </div>

              <div className="adm-order-items">
                {selected.items.map((item) => (
                  <div className="adm-order-item" key={item.key}>
                    <img src={item.image} alt="" />
                    <div>
                      <b>{item.name}</b>
                      <small>
                        {item.sizeLabel ? `${item.sizeLabel} · ` : ''}
                        {item.qty} × {formatTaka(item.unitPrice)}
                        {item.note ? ` · “${item.note}”` : ''}
                      </small>
                    </div>
                    <b>{formatTaka(item.qty * item.unitPrice)}</b>
                  </div>
                ))}
              </div>

              <div className="adm-totals">
                <p>
                  <span>সাবটোটাল</span>
                  <b>{formatTaka(selected.subtotal)}</b>
                </p>
                {selected.discount > 0 && (
                  <p className="is-discount">
                    <span>ডিসকাউন্ট {selected.promo ? `(${selected.promo})` : ''}</span>
                    <b>−{formatTaka(selected.discount)}</b>
                  </p>
                )}
                <p>
                  <span>ডেলিভারি</span>
                  <b>{selected.delivery ? formatTaka(selected.delivery) : 'ফ্রি'}</b>
                </p>
                <p className="is-total">
                  <span>সর্বমোট</span>
                  <b>{formatTaka(selected.total)}</b>
                </p>
              </div>

              {confirmDelete ? (
                <div className="adm-confirm">
                  <p>এই অর্ডারটি স্থায়ীভাবে মুছে ফেলবেন? এটি ফেরানো যাবে না।</p>
                  <div>
                    <button type="button" className="adm-btn danger sm" onClick={() => remove(selected.id)}>
                      <IconTrash /> হ্যাঁ, মুছুন
                    </button>
                    <button type="button" className="adm-btn ghost sm" onClick={() => setConfirmDelete(false)}>
                      বাতিল
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="adm-modal-foot">
              <select
                className="adm-select"
                value={selected.status}
                onChange={(e) => changeStatus(selected.id, e.target.value)}
                aria-label="স্ট্যাটাস বদলান"
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <a
                className="adm-btn whatsapp sm"
                href={waLink(selected.customer.phone)}
                target="_blank"
                rel="noreferrer"
              >
                <IconWhatsapp /> WhatsApp
              </a>
              {!confirmDelete && (
                <button type="button" className="adm-btn danger-ghost sm" onClick={() => setConfirmDelete(true)}>
                  <IconTrash /> মুছুন
                </button>
              )}
              <button type="button" className="adm-btn dark sm" onClick={close}>
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
