import { ORDER_STATUSES } from '../../src/data/orders.js';

export const SESSION_COOKIE = 'ch_session';
export const SESSION_DAYS = 7;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const STATUSES = ORDER_STATUSES;

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

export function fail(message, status = 400, extra = {}) {
  return json({ error: message, ...extra }, status);
}

export async function readJson(request, limit = 100 * 1024) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw Object.assign(new Error('অনুরোধের ধরন সঠিক নয়'), { status: 415 });
  const text = await request.text();
  if (text.length > limit) throw Object.assign(new Error('অনুরোধ অনেক বড়'), { status: 413 });
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error('অনুরোধের ডেটা পড়া যায়নি'), { status: 400 });
  }
}

export function getCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

export function sessionCookie(token, request, maxAge = SESSION_DAYS * 24 * 60 * 60) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  const value = token
    ? `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
    : `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
  return value;
}

const encoder = new TextEncoder();

export function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256Hex(value) {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

export function randomToken(bytes = 32) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return toHex(buf);
}

export function randomCode(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(buf)
    .map((n) => alphabet[n % alphabet.length])
    .join('');
}

export async function hashPassword(password, saltHex, iterations = 150000) {
  const salt = Uint8Array.from(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return toHex(bits);
}

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function currentAdmin(context) {
  const { request, env } = context;
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const hash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT a.id, a.username, s.expires_at FROM sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token_hash = ?`,
  )
    .bind(hash)
    .first();
  if (!row) return null;
  if (new Date(`${row.expires_at.replace(' ', 'T')}Z`).getTime() < Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run();
    return null;
  }
  return { id: row.id, username: row.username, tokenHash: hash };
}

export async function rateLimit(env, bucket, limit, windowMs) {
  const now = Date.now();
  const row = await env.DB.prepare('SELECT count, window_start FROM rate_limits WHERE bucket = ?').bind(bucket).first();
  if (!row || now - row.window_start > windowMs) {
    await env.DB.prepare(
      'INSERT INTO rate_limits (bucket, count, window_start) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET count = 1, window_start = excluded.window_start',
    )
      .bind(bucket, now)
      .run();
    return true;
  }
  if (row.count >= limit) return false;
  await env.DB.prepare('UPDATE rate_limits SET count = count + 1 WHERE bucket = ?').bind(bucket).run();
  return true;
}

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'local';
}

export function cleanText(value, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function isHttpUrl(value) {
  if (typeof value !== 'string' || !value) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sqliteIso(value) {
  if (!value) return new Date().toISOString();
  return `${String(value).replace(' ', 'T')}Z`;
}

export async function readSetting(env, key, fallback) {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

export async function writeSetting(env, key, value) {
  await env.DB.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  )
    .bind(key, JSON.stringify(value))
    .run();
}

export const ORDER_COLUMNS =
  'id, code, customer_name, phone, address, area, delivery_date, slot, payment, note, subtotal, discount, promo, delivery_fee, total, items, status, created_at, updated_at';

export function rowToOrder(row) {
  let items = [];
  try {
    items = JSON.parse(row.items);
  } catch {
    items = [];
  }
  return {
    id: row.code,
    code: row.code,
    placedAt: sqliteIso(row.created_at),
    updatedAt: sqliteIso(row.updated_at),
    items,
    subtotal: row.subtotal,
    discount: row.discount,
    promo: row.promo || '',
    delivery: row.delivery_fee,
    total: row.total,
    customer: {
      name: row.customer_name,
      phone: row.phone,
      address: row.address,
      area: row.area,
      date: row.delivery_date,
      slot: row.slot,
      payment: row.payment,
      note: row.note || '',
    },
    paymentLabel: row.payment === 'cash' ? 'ক্যাশ অন ডেলিভারি' : 'bKash (ম্যানুয়াল পেমেন্ট)',
    status: row.status,
  };
}

export function rowToProduct(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    bn: row.bn,
    category: row.category,
    image: row.image,
    price: row.price,
    oldPrice: row.old_price ?? undefined,
    rating: row.rating,
    reviews: row.reviews,
    badge: row.badge || '',
    tag: row.tag || '',
    desc: row.description || '',
    sizes: Boolean(row.sizes),
    outOfStock: Boolean(row.out_of_stock),
  };
}

export function rowToBanner(row) {
  return {
    id: row.id,
    eyebrow: row.eyebrow || '',
    title: row.title || '',
    highlight: row.highlight || '',
    desc: row.description || '',
    image: row.image || '',
    primaryLabel: row.primary_label || '',
    primaryTo: row.primary_to || '',
    secondaryLabel: row.secondary_label || '',
    secondaryTo: row.secondary_to || '',
    showStats: Boolean(row.show_stats),
    active: Boolean(row.active),
  };
}

export function normalizePhone(value) {
  return String(value || '').replace(/[\s-]/g, '');
}

export function validPhone(value) {
  return /^01[3-9]\d{8}$/.test(normalizePhone(value));
}

export function productInsertStatement(env, p, sort) {
  return env.DB.prepare(
    `INSERT INTO products (id, slug, name, bn, category, image, price, old_price, rating, reviews, badge, tag, description, sizes, out_of_stock, sort)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    p.id,
    p.slug,
    p.name,
    p.bn,
    p.category,
    p.image,
    p.price,
    p.oldPrice ?? null,
    p.rating ?? 4.8,
    p.reviews ?? 0,
    p.badge || '',
    p.tag || '',
    p.desc || '',
    p.sizes === false ? 0 : 1,
    p.outOfStock ? 1 : 0,
    sort,
  );
}

export function categoryInsertStatement(env, c, sort) {
  return env.DB.prepare('INSERT INTO categories (slug, name, bn, image, sort) VALUES (?, ?, ?, ?, ?)').bind(
    c.slug,
    c.name,
    c.bn,
    c.image,
    sort,
  );
}

export function bannerInsertStatement(env, b, sort) {
  return env.DB.prepare(
    `INSERT INTO banners (id, eyebrow, title, highlight, description, image, primary_label, primary_to, secondary_label, secondary_to, show_stats, active, sort)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    b.id,
    b.eyebrow || '',
    b.title || '',
    b.highlight || '',
    b.desc || '',
    b.image || '',
    b.primaryLabel || '',
    b.primaryTo || '',
    b.secondaryLabel || '',
    b.secondaryTo || '',
    b.showStats ? 1 : 0,
    b.active === false ? 0 : 1,
    sort,
  );
}
