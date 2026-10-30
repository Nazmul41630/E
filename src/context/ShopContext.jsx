import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, notify } from '../api/client';

const ShopContext = createContext(null);

const CART_KEY = 'cakehaus_cart_v1';
const ORDER_KEY = 'cakehaus_orders_v1';
const PHONE_KEY = 'cakehaus_phone_v1';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable */
  }
}

export function ShopProvider({ children }) {
  const [cart, setCart] = useState(() => load(CART_KEY, []));
  const [orders, setOrders] = useState(() => load(ORDER_KEY, []));
  const [adminOrders, setAdminOrders] = useState([]);
  const [lookupPhone, setLookupPhone] = useState(() => load(PHONE_KEY, ''));
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [ordersBusy, setOrdersBusy] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const toastId = useRef(0);

  useEffect(() => {
    save(CART_KEY, cart);
  }, [cart]);

  useEffect(() => {
    save(ORDER_KEY, orders);
  }, [orders]);

  useEffect(() => {
    save(PHONE_KEY, lookupPhone);
  }, [lookupPhone]);

  const pushToast = useCallback((message, tone = 'success') => {
    const id = ++toastId.current;
    setToasts((list) => [...list.slice(-2), { id, message, tone }]);
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  useEffect(() => {
    const onToast = (event) => pushToast(event.detail?.message || 'কিছু একটা ভুল হয়েছে', event.detail?.tone || 'error');
    window.addEventListener('cakehaus:toast', onToast);
    return () => window.removeEventListener('cakehaus:toast', onToast);
  }, [pushToast]);

  const addToCart = useCallback(
    (product, { qty = 1, sizeIndex = 0, unitPrice, note = '' } = {}) => {
      const sizeLabel = product.sizes ? ['১ পাউন্ড', '২ পাউন্ড', '৩ পাউন্ড'][sizeIndex] : null;
      const key = `${product.id}::${sizeIndex}::${note}`;
      const price = unitPrice ?? product.price;
      setCart((list) => {
        const found = list.find((item) => item.key === key);
        if (found) {
          return list.map((item) => (item.key === key ? { ...item, qty: item.qty + qty } : item));
        }
        return [
          ...list,
          {
            key,
            id: product.id,
            slug: product.slug,
            name: product.name,
            bn: product.bn,
            image: product.image,
            sizeLabel,
            sizeIndex: product.sizes ? sizeIndex : 0,
            unitPrice: price,
            basePrice: product.price,
            note,
            qty,
          },
        ];
      });
      pushToast(`${product.name} কার্টে যোগ হয়েছে`);
    },
    [pushToast],
  );

  const updateQty = useCallback((key, delta) => {
    setCart((list) =>
      list
        .map((item) => (item.key === key ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
        .filter((item) => item.qty > 0),
    );
  }, []);

  const removeItem = useCallback((key) => {
    setCart((list) => list.filter((item) => item.key !== key));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0), [cart]);

  const remember = useCallback((order) => {
    setOrders((list) => [order, ...list.filter((o) => o.id !== order.id)].slice(0, 50));
  }, []);

  const submitOrder = useCallback(
    async ({ customer, items, promo }) => {
      const data = await api('/orders', {
        method: 'POST',
        body: { customer, items, promo },
      });
      const order = data.order;
      remember(order);
      setLookupPhone(order.customer.phone);
      setCart([]);
      return order;
    },
    [remember],
  );

  const fetchOrders = useCallback(async (phone) => {
    const normalized = String(phone || '').replace(/[\s-]/g, '');
    setOrdersBusy(true);
    setOrdersError('');
    try {
      const data = await api(`/orders?phone=${encodeURIComponent(normalized)}`);
      setOrders(data.orders);
      setLookupPhone(normalized);
      return data.orders;
    } catch (err) {
      setOrdersError(err.message);
      throw err;
    } finally {
      setOrdersBusy(false);
    }
  }, []);

  const fetchOrder = useCallback(
    async (code) => {
      const cached = orders.find((o) => o.id === code);
      if (cached) return cached;
      const phone = String(lookupPhone || '').replace(/[\s-]/g, '');
      if (!phone) return null;
      try {
        const data = await api(`/orders/${encodeURIComponent(code)}?phone=${encodeURIComponent(phone)}`);
        remember(data.order);
        return data.order;
      } catch {
        return null;
      }
    },
    [orders, lookupPhone, remember],
  );

  const loadAdminOrders = useCallback(async () => {
    try {
      const data = await api('/admin/orders');
      setAdminOrders(data.orders);
    } catch (err) {
      notify(err.message);
    }
  }, []);

  const updateOrderStatus = useCallback(
    async (id, status) => {
      const previous = adminOrders;
      setAdminOrders((list) => list.map((o) => (o.id === id ? { ...o, status } : o)));
      try {
        const data = await api(`/admin/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } });
        setAdminOrders((list) => list.map((o) => (o.id === id ? data.order : o)));
        return true;
      } catch (err) {
        setAdminOrders(previous);
        notify(err.message);
        return false;
      }
    },
    [adminOrders],
  );

  const deleteOrder = useCallback(
    async (id) => {
      const previous = adminOrders;
      setAdminOrders((list) => list.filter((o) => o.id !== id));
      try {
        await api(`/admin/orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
        return true;
      } catch (err) {
        setAdminOrders(previous);
        notify(err.message);
        return false;
      }
    },
    [adminOrders],
  );

  const value = useMemo(
    () => ({
      cart,
      cartCount,
      cartTotal,
      cartOpen,
      setCartOpen,
      addToCart,
      updateQty,
      removeItem,
      clearCart,
      toasts,
      pushToast,
      orders,
      adminOrders,
      submitOrder,
      fetchOrders,
      fetchOrder,
      lookupPhone,
      ordersBusy,
      ordersError,
      loadAdminOrders,
      updateOrderStatus,
      deleteOrder,
    }),
    [
      cart,
      cartCount,
      cartTotal,
      cartOpen,
      addToCart,
      updateQty,
      removeItem,
      clearCart,
      toasts,
      pushToast,
      orders,
      adminOrders,
      submitOrder,
      fetchOrders,
      fetchOrder,
      lookupPhone,
      ordersBusy,
      ordersError,
      loadAdminOrders,
      updateOrderStatus,
      deleteOrder,
    ],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used inside ShopProvider');
  return ctx;
}
