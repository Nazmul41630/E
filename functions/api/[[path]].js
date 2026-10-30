import {
  MAX_IMAGE_BYTES,
  ORDER_COLUMNS,
  SESSION_DAYS,
  STATUSES,
  bannerInsertStatement,
  categoryInsertStatement,
  cleanText,
  clientIp,
  currentAdmin,
  fail,
  hashPassword,
  isHttpUrl,
  json,
  normalizePhone,
  productInsertStatement,
  randomCode,
  randomToken,
  rateLimit,
  readJson,
  readSetting,
  rowToBanner,
  rowToOrder,
  rowToProduct,
  safeEqual,
  sessionCookie,
  sha256Hex,
  validPhone,
  writeSetting,
} from '../_lib/api.js';
import { deliveryFees, freeDeliveryAbove, sizeFactors } from '../../src/data/products.js';
import { DEFAULT_SETTINGS } from '../../src/data/settings.js';
import { SOCIAL_CHANNELS } from '../../src/data/social.js';

const SLOTS = ['সকাল ১০টা – দুপুর ২টা', 'দুপুর ২টা – সন্ধ্যা ৬টা', 'সন্ধ্যা ৬টা – রাত ১০টা'];
const SOCIAL_KEYS = new Set(SOCIAL_CHANNELS.map((channel) => channel.key));
const PROMO_PERCENT = 0.1;

const httpError = (message, status = 400) => Object.assign(new Error(message), { status });

function hasBadOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}

function todayIso() {
  // Asia/Dhaka is UTC+6 with no DST.
  return new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10);
}

async function requireAdmin(context) {
  const admin = await currentAdmin(context);
  if (!admin) throw httpError('লগইন করুন', 401);
  return admin;
}

function publicSettings(stored, imgbbKeySet) {
  const base = stored && typeof stored === 'object' ? stored : {};
  return {
    buyNow: { ...DEFAULT_SETTINGS.buyNow, ...(base.buyNow || {}) },
    promo: { ...DEFAULT_SETTINGS.promo, ...(base.promo || {}) },
    imgbbKeySet: Boolean(imgbbKeySet),
  };
}

async function readImgbbKey(env) {
  const value = await readSetting(env, 'imgbbKey', '');
  return typeof value === 'string' ? value : '';
}

async function bootstrap(context) {
  const { env } = context;
  const [products, categories, banners, stored, social, admin, imgbbKey] = await Promise.all([
    env.DB.prepare('SELECT * FROM products ORDER BY sort, created_at').all(),
    env.DB.prepare('SELECT * FROM categories ORDER BY sort').all(),
    env.DB.prepare('SELECT * FROM banners ORDER BY sort').all(),
    readSetting(env, 'store', DEFAULT_SETTINGS),
    readSetting(env, 'social', {}),
    currentAdmin(context),
    readImgbbKey(env),
  ]);

  return json({
    products: products.results.map(rowToProduct),
    categories: categories.results.map(({ slug, name, bn, image }) => ({ slug, name, bn, image })),
    banners: banners.results.map(rowToBanner),
    settings: publicSettings(stored, imgbbKey),
    social,
    admin: admin ? { id: admin.id, username: admin.username } : null,
    statuses: STATUSES,
  });
}

async function login(context) {
  const { env, request } = context;
  const ip = clientIp(request);
  if (!(await rateLimit(env, `login:${ip}`, 12, 10 * 60 * 1000))) {
    throw httpError('অনেকবার চেষ্টা হয়েছে — ১০ মিনিট পর আবার চেষ্টা করুন', 429);
  }
  const body = await readJson(request, 4096);
  const username = cleanText(body.username, 40).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) throw httpError('ইউজারনেম ও পাসওয়ার্ড দিন', 422);

  const row = await env.DB.prepare(
    'SELECT id, username, password_hash, salt, iterations FROM admins WHERE username = ?',
  )
    .bind(username)
    .first();
  if (!row) {
    await hashPassword(password, '00'.repeat(16));
    throw httpError('ইউজারনেম বা পাসওয়ার্ড ঠিক নেই', 401);
  }
  const candidate = await hashPassword(password, row.salt, row.iterations);
  if (!safeEqual(candidate, row.password_hash)) throw httpError('ইউজারনেম বা পাসওয়ার্ড ঠিক নেই', 401);

  const token = randomToken(32);
  const hash = await sha256Hex(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')"),
    env.DB.prepare('INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)').bind(hash, row.id, expires),
  ]);
  return json(
    { admin: { id: row.id, username: row.username } },
    200,
    { 'set-cookie': sessionCookie(token, request) },
  );
}

async function logout(context) {
  const { env, request } = context;
  const token = (request.headers.get('cookie') || '').match(/ch_session=([^;]+)/);
  if (token) {
    const hash = await sha256Hex(decodeURIComponent(token[1]));
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run();
  }
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', request, 0) });
}

async function changePassword(context) {
  const { env, request } = context;
  const admin = await requireAdmin(context);
  const body = await readJson(request, 8192);
  const current = typeof body.current === 'string' ? body.current : '';
  const next = typeof body.next === 'string' ? body.next : '';
  if (next.length < 8) throw httpError('নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষর দিন', 422);

  const row = await env.DB.prepare('SELECT password_hash, salt, iterations FROM admins WHERE id = ?')
    .bind(admin.id)
    .first();
  const candidate = await hashPassword(current, row.salt, row.iterations);
  if (!safeEqual(candidate, row.password_hash)) throw httpError('বর্তমান পাসওয়ার্ড ঠিক নেই', 401);

  const salt = randomToken(16);
  const iterations = 150000;
  const hash = await hashPassword(next, salt, iterations);
  await env.DB.prepare('UPDATE admins SET password_hash = ?, salt = ?, iterations = ? WHERE id = ?')
    .bind(hash, salt, iterations, admin.id)
    .run();

  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE admin_id = ?').bind(admin.id),
    env.DB.prepare('INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)').bind(
      tokenHash,
      admin.id,
      expires,
    ),
  ]);
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(token, request) });
}

function buildOrderItems(input, productRows) {
  if (!Array.isArray(input) || input.length === 0) throw httpError('কার্টে কোনো কেক নেই', 422);
  if (input.length > 30) throw httpError('একসাথে সর্বোচ্চ ৩০ ধরনের কেক অর্ডার করা যায়', 422);

  const byId = new Map(productRows.map((row) => [row.id, row]));
  const merged = new Map();

  for (const raw of input) {
    const id = cleanText(raw?.id, 64);
    const product = byId.get(id);
    if (!product) throw httpError('কার্টে থাকা একটি কেক আর পাওয়া যাচ্ছে না — কার্ট রিফ্রেশ করুন', 422);
    if (product.out_of_stock) throw httpError(`${product.bn || product.name} এখন স্টকে নেই`, 422);
    const sizeIndex = Number.isInteger(raw?.sizeIndex) && product.sizes ? raw.sizeIndex : 0;
    const factor = sizeFactors[sizeIndex];
    if (!factor) throw httpError('কেকের সাইজ সঠিক নয়', 422);
    const qty = Number(raw?.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw httpError('কেকের পরিমাণ ১ থেকে ২০ হতে হবে', 422);
    const note = cleanText(raw?.note, 120);
    const unitPrice = Math.round((product.price * factor.factor) / 10) * 10;
    const key = `${product.id}::${product.sizes ? sizeIndex : 0}::${note}`;
    const found = merged.get(key);
    if (found) {
      found.qty += qty;
      if (found.qty > 20) throw httpError('একটি কেকের পরিমাণ সর্বোচ্চ ২০', 422);
    } else {
      merged.set(key, {
        key,
        id: product.id,
        slug: product.slug,
        name: product.name,
        bn: product.bn,
        image: product.image,
        sizeLabel: product.sizes ? factor.label : null,
        sizeIndex: product.sizes ? sizeIndex : 0,
        unitPrice,
        basePrice: product.price,
        note,
        qty,
      });
    }
  }

  const items = [...merged.values()];
  const count = items.reduce((sum, item) => sum + item.qty, 0);
  if (count > 50) throw httpError('একসাথে সর্বোচ্চ ৫০টি কেক অর্ডার করা যায়', 422);
  return items;
}

async function createOrder(context) {
  const { env, request } = context;
  const ip = clientIp(request);
  if (!(await rateLimit(env, `order:${ip}`, 20, 10 * 60 * 1000))) {
    throw httpError('অনেকবার অর্ডার চেষ্টা হয়েছে — একটু পরে আবার চেষ্টা করুন', 429);
  }

  const body = await readJson(request, 256 * 1024);
  const customer = body.customer || {};
  const name = cleanText(customer.name, 80);
  const phone = normalizePhone(customer.phone);
  const address = cleanText(customer.address, 300);
  const area = customer.area === 'outside' ? 'outside' : customer.area === 'inside' ? 'inside' : '';
  const date = cleanText(customer.date, 10);
  const slot = cleanText(customer.slot, 60);
  const payment = customer.payment === 'bkash' ? 'bkash' : customer.payment === 'cash' ? 'cash' : '';
  const note = cleanText(customer.note, 200);

  if (name.length < 3) throw httpError('পুরো নাম লিখুন', 422);
  if (!validPhone(phone)) throw httpError('সঠিক মোবাইল নম্বর দিন (১১ ডিজিট)', 422);
  if (address.length < 10) throw httpError('বিস্তারিত ঠিকানা লিখুন', 422);
  if (!area) throw httpError('ডেলিভারি এলাকা বেছে নিন', 422);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayIso()) throw httpError('ডেলিভারির তারিখ সঠিক নয়', 422);
  if (!SLOTS.includes(slot)) throw httpError('ডেলিভারির সময় সঠিক নয়', 422);
  if (!payment) throw httpError('পেমেন্ট মেথড বেছে নিন', 422);

  const items = buildOrderItems(body.items, (await env.DB.prepare('SELECT * FROM products').all()).results);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const stored = await readSetting(env, 'store', DEFAULT_SETTINGS);
  const promo = publicSettings(stored, false).promo;
  const code = cleanText(body.promo, 24).toUpperCase();
  const appliedPromo = promo.enabled && code && promo.code && code === String(promo.code).toUpperCase() ? code : '';
  const discount = appliedPromo ? Math.round(subtotal * PROMO_PERCENT) : 0;
  const delivery = subtotal >= freeDeliveryAbove ? 0 : deliveryFees[area];
  const total = Math.max(0, subtotal - discount) + delivery;

  const insert = (orderCode) =>
    env.DB.prepare(
      `INSERT INTO orders (code, customer_name, phone, address, area, delivery_date, slot, payment, note, subtotal, discount, promo, delivery_fee, total, items, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      orderCode,
      name,
      phone,
      address,
      area,
      date,
      slot,
      payment,
      note,
      subtotal,
      discount,
      appliedPromo,
      delivery,
      total,
      JSON.stringify(items),
      STATUSES[0],
    );

  let orderCode = '';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `CH${randomCode(6)}`;
    try {
      await insert(candidate).run();
      orderCode = candidate;
      break;
    } catch (err) {
      if (!String(err?.message || '').includes('UNIQUE')) throw err;
    }
  }
  if (!orderCode) throw httpError('অর্ডার সেভ করা যায়নি — আবার চেষ্টা করুন', 500);

  const row = await env.DB.prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE code = ?`).bind(orderCode).first();
  return json({ order: rowToOrder(row) }, 201);
}

async function listOrders(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const phone = normalizePhone(url.searchParams.get('phone'));
  if (!validPhone(phone)) throw httpError('সঠিক মোবাইল নম্বর দিন', 422);
  if (!(await rateLimit(env, `lookup:${clientIp(request)}`, 40, 10 * 60 * 1000))) {
    throw httpError('অনেকবার চেষ্টা হয়েছে — একটু পরে দেখুন', 429);
  }
  const rows = await env.DB.prepare(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE phone = ? ORDER BY created_at DESC LIMIT 50`,
  )
    .bind(phone)
    .all();
  return json({ orders: rows.results.map(rowToOrder) });
}

async function getOrder(context, code) {
  const { env, request } = context;
  const phone = normalizePhone(new URL(request.url).searchParams.get('phone'));
  if (!validPhone(phone)) throw httpError('সঠিক মোবাইল নম্বর দিন', 422);
  if (!(await rateLimit(env, `lookup:${clientIp(request)}`, 40, 10 * 60 * 1000))) {
    throw httpError('অনেকবার চেষ্টা হয়েছে — একটু পরে দেখুন', 429);
  }
  const row = await env.DB.prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE code = ? AND phone = ?`)
    .bind(cleanText(code, 20), phone)
    .first();
  if (!row) return fail('অর্ডারটি পাওয়া যায়নি', 404);
  return json({ order: rowToOrder(row) });
}

async function adminOrders(context) {
  const { env } = context;
  await requireAdmin(context);
  const rows = await env.DB.prepare(`SELECT ${ORDER_COLUMNS} FROM orders ORDER BY created_at DESC LIMIT 500`).all();
  return json({ orders: rows.results.map(rowToOrder) });
}

async function updateOrder(context, code) {
  const { env, request } = context;
  await requireAdmin(context);
  const body = await readJson(request, 2048);
  if (!STATUSES.includes(body.status)) throw httpError('স্ট্যাটাস সঠিক নয়', 422);
  const result = await env.DB.prepare(
    "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE code = ?",
  )
    .bind(body.status, cleanText(code, 20))
    .run();
  if (!result.meta?.changes) return fail('অর্ডারটি পাওয়া যায়নি', 404);
  const row = await env.DB.prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE code = ?`).bind(cleanText(code, 20)).first();
  return json({ order: rowToOrder(row) });
}

async function deleteOrder(context, code) {
  const { env } = context;
  await requireAdmin(context);
  const result = await env.DB.prepare('DELETE FROM orders WHERE code = ?').bind(cleanText(code, 20)).run();
  if (!result.meta?.changes) return fail('অর্ডারটি পাওয়া যায়নি', 404);
  return json({ ok: true });
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function bounds(value, min, max, fallback = min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function sanitizeProduct(raw, index) {
  const id = cleanText(raw?.id, 64);
  const slug = cleanText(raw?.slug, 80);
  const name = cleanText(raw?.name, 120);
  const bn = cleanText(raw?.bn, 160);
  if (!SLUG_RE.test(id)) throw httpError(`প্রোডাক্ট আইডি সঠিক নয় (${id || 'খালি'})`, 422);
  if (!SLUG_RE.test(slug)) throw httpError(`প্রোডাক্ট slug সঠিক নয় (${slug || 'খালি'})`, 422);
  if (name.length < 2) throw httpError('প্রোডাক্টের নাম দিন', 422);
  if (bn.length < 2) throw httpError('প্রোডাক্টের বাংলা নাম দিন', 422);
  const category = cleanText(raw?.category, 64) || 'birthday';
  const image = cleanText(raw?.image, 500);
  if (!isHttpUrl(image)) throw httpError(`${name}: ছবির লিংক সঠিক নয়`, 422);
  const price = bounds(raw?.price, 1, 1000000);
  const oldPrice = raw?.oldPrice ? bounds(raw.oldPrice, 1, 1000000) : null;
  if (oldPrice !== null && oldPrice <= price) throw httpError(`${name}: পুরনো দাম বর্তমান দামের চেয়ে বেশি হতে হবে`, 422);
  return {
    id,
    slug,
    name,
    bn,
    category,
    image,
    price,
    oldPrice,
    rating: Math.min(5, Math.max(0, Number(raw?.rating) || 4.8)),
    reviews: bounds(raw?.reviews, 0, 1000000, 0),
    badge: cleanText(raw?.badge, 40),
    tag: cleanText(raw?.tag, 80),
    desc: cleanText(raw?.desc, 1200),
    sizes: raw?.sizes !== false,
    outOfStock: Boolean(raw?.outOfStock),
    sort: index,
  };
}

async function saveProducts(context) {
  const { env, request } = context;
  await requireAdmin(context);
  const body = await readJson(request, 512 * 1024);
  if (!Array.isArray(body.products)) throw httpError('প্রোডাক্ট লিস্ট সঠিক নয়', 422);
  if (body.products.length > 300) throw httpError('সর্বোচ্চ ৩০০ প্রোডাক্ট রাখা যায়', 422);
  const list = body.products.map(sanitizeProduct);
  const ids = new Set();
  const slugs = new Set();
  for (const product of list) {
    if (ids.has(product.id)) throw httpError(`ডুপ্লিকেট প্রোডাক্ট আইডি: ${product.id}`, 422);
    if (slugs.has(product.slug)) throw httpError(`ডুপ্লিকেট slug: ${product.slug}`, 422);
    ids.add(product.id);
    slugs.add(product.slug);
  }
  const statements = [env.DB.prepare('DELETE FROM products')];
  list.forEach((product) => statements.push(productInsertStatement(env, product, product.sort)));
  await env.DB.batch(statements);
  const rows = await env.DB.prepare('SELECT * FROM products ORDER BY sort, created_at').all();
  return json({ products: rows.results.map(rowToProduct) });
}

async function saveCategories(context) {
  const { env, request } = context;
  await requireAdmin(context);
  const body = await readJson(request, 128 * 1024);
  if (!Array.isArray(body.categories)) throw httpError('ক্যাটাগরি লিস্ট সঠিক নয়', 422);
  if (body.categories.length > 60) throw httpError('সর্বোচ্চ ৬০ ক্যাটাগরি রাখা যায়', 422);
  const seen = new Set();
  const list = body.categories.map((raw, index) => {
    const slug = cleanText(raw?.slug, 64).toLowerCase();
    const name = cleanText(raw?.name, 80);
    const bn = cleanText(raw?.bn, 80);
    if (!SLUG_RE.test(slug)) throw httpError(`ক্যাটাগরি slug সঠিক নয় (${slug || 'খালি'})`, 422);
    if (seen.has(slug)) throw httpError(`ডুপ্লিকেট ক্যাটাগরি: ${slug}`, 422);
    seen.add(slug);
    if (name.length < 2 || bn.length < 2) throw httpError('ক্যাটাগরির নাম দিন', 422);
    const image = cleanText(raw?.image, 500);
    if (!isHttpUrl(image)) throw httpError(`${name}: ছবির লিংক সঠিক নয়`, 422);
    return { slug, name, bn, image, sort: index };
  });
  const statements = [env.DB.prepare('DELETE FROM categories')];
  list.forEach((category) => statements.push(categoryInsertStatement(env, category, category.sort)));
  await env.DB.batch(statements);
  const rows = await env.DB.prepare('SELECT * FROM categories ORDER BY sort').all();
  return json({ categories: rows.results.map(({ slug, name, bn, image }) => ({ slug, name, bn, image })) });
}

async function saveBanners(context) {
  const { env, request } = context;
  await requireAdmin(context);
  const body = await readJson(request, 256 * 1024);
  if (!Array.isArray(body.banners)) throw httpError('ব্যানার লিস্ট সঠিক নয়', 422);
  if (body.banners.length > 30) throw httpError('সর্বোচ্চ ৩০টি ব্যানার রাখা যায়', 422);
  const seen = new Set();
  const list = body.banners.map((raw, index) => {
    const id = cleanText(raw?.id, 64);
    if (!SLUG_RE.test(id)) throw httpError(`ব্যানার আইডি সঠিক নয় (${id || 'খালি'})`, 422);
    if (seen.has(id)) throw httpError(`ডুপ্লিকেট ব্যানার: ${id}`, 422);
    seen.add(id);
    const link = (value) => {
      const text = cleanText(value, 500);
      if (!text) return '';
      if (text.startsWith('/') || isHttpUrl(text)) return text;
      throw httpError(`${id}: লিংক “/” দিয়ে শুরু করুন`, 422);
    };
    const image = cleanText(raw?.image, 500);
    if (image && !isHttpUrl(image)) throw httpError(`${id}: ছবির লিংক সঠিক নয়`, 422);
    return {
      id,
      eyebrow: cleanText(raw?.eyebrow, 120),
      title: cleanText(raw?.title, 120),
      highlight: cleanText(raw?.highlight, 80),
      desc: cleanText(raw?.desc, 600),
      image,
      primaryLabel: cleanText(raw?.primaryLabel, 60),
      primaryTo: link(raw?.primaryTo),
      secondaryLabel: cleanText(raw?.secondaryLabel, 60),
      secondaryTo: link(raw?.secondaryTo),
      showStats: Boolean(raw?.showStats),
      active: raw?.active !== false,
      sort: index,
    };
  });
  const statements = [env.DB.prepare('DELETE FROM banners')];
  list.forEach((banner) => statements.push(bannerInsertStatement(env, banner, banner.sort)));
  await env.DB.batch(statements);
  const rows = await env.DB.prepare('SELECT * FROM banners ORDER BY sort').all();
  return json({ banners: rows.results.map(rowToBanner) });
}

async function saveSettings(context) {
  const { env, request } = context;
  await requireAdmin(context);
  const body = await readJson(request, 8192);
  const stored = await readSetting(env, 'store', DEFAULT_SETTINGS);
  const current = publicSettings(stored, false);

  const buyNow = { ...current.buyNow };
  if (body.buyNow && typeof body.buyNow === 'object') {
    if (typeof body.buyNow.enabled === 'boolean') buyNow.enabled = body.buyNow.enabled;
    if (body.buyNow.message !== undefined) buyNow.message = cleanText(body.buyNow.message, 140);
  }

  const promo = { ...current.promo };
  if (body.promo && typeof body.promo === 'object') {
    const code = cleanText(body.promo.code, 24).toUpperCase();
    if (/[^A-Z0-9_-]/.test(code)) throw httpError('কুপন কোডে শুধু ইংরেজি অক্ষর ও সংখ্যা চলবে', 422);
    const ctaTo = cleanText(body.promo.ctaTo, 500);
    if (ctaTo && !ctaTo.startsWith('/')) throw httpError('প্রোমো লিংক “/” দিয়ে শুরু করুন', 422);
    if (typeof body.promo.enabled === 'boolean') promo.enabled = body.promo.enabled;
    promo.kicker = cleanText(body.promo.kicker, 80);
    promo.title = cleanText(body.promo.title, 160);
    promo.desc = cleanText(body.promo.desc, 400);
    promo.code = code;
    promo.ctaLabel = cleanText(body.promo.ctaLabel, 60);
    promo.ctaTo = ctaTo;
  }

  await writeSetting(env, 'store', { buyNow, promo });

  let imgbbKey = await readImgbbKey(env);
  if (Object.prototype.hasOwnProperty.call(body, 'imgbbKey')) {
    const next = cleanText(body.imgbbKey, 100);
    if (next && !/^[A-Za-z0-9]+$/.test(next)) throw httpError('ImgBB key-তে শুধু ইংরেজি অক্ষর ও সংখ্যা থাকে', 422);
    if (next) {
      await writeSetting(env, 'imgbbKey', next);
      imgbbKey = next;
    } else {
      await env.DB.prepare("DELETE FROM settings WHERE key = 'imgbbKey'").run();
      imgbbKey = '';
    }
  }

  return json({ settings: publicSettings({ buyNow, promo }, imgbbKey) });
}

async function saveSocial(context) {
  const { env, request } = context;
  await requireAdmin(context);
  const body = await readJson(request, 8192);
  const input = body.social;
  if (!input || typeof input !== 'object') throw httpError('সোশ্যাল ডেটা সঠিক নয়', 422);

  const next = {};
  for (const [key, row] of Object.entries(input)) {
    if (!SOCIAL_KEYS.has(key)) continue;
    next[key] = {
      value: cleanText(row?.value, 200),
      enabled: Boolean(row?.enabled),
    };
  }
  if (Object.keys(next).length === 0) throw httpError('কোনো সোশ্যাল চ্যানেল পাওয়া যায়নি', 422);
  await writeSetting(env, 'social', next);
  return json({ social: next });
}

function imageKind(buf) {
  const bytes = new Uint8Array(buf);
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  const head = (start, end) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes.length > 12 && head(0, 4) === 'RIFF' && head(8, 12) === 'WEBP') {
    return { ext: 'webp', mime: 'image/webp' };
  }
  if (bytes.length > 6 && head(0, 4) === 'GIF8') return { ext: 'gif', mime: 'image/gif' };
  if (bytes.length > 12 && head(4, 8) === 'ftyp' && ['avif', 'avis'].includes(head(8, 12))) {
    return { ext: 'avif', mime: 'image/avif' };
  }
  return null;
}

async function uploadImage(context) {
  const { env, request } = context;
  await requireAdmin(context);
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_IMAGE_BYTES) throw httpError('ছবিটি ৮MB এর চেয়ে বড়', 413);

  const buffer = await request.arrayBuffer();
  if (!buffer.byteLength) throw httpError('ছবি পাওয়া যায়নি', 422);
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw httpError('ছবিটি ৮MB এর চেয়ে বড়', 413);

  const kind = imageKind(buffer);
  if (!kind) throw httpError('শুধু JPG, PNG, WebP, GIF বা AVIF ছবি নেওয়া হয়', 415);

  const key = (await readImgbbKey(env)) || env.IMGBB_KEY || '';
  if (!key) {
    throw httpError('আগে অ্যাডমিন সেটিংসে ImgBB API key সেভ করুন', 400);
  }

  const form = new FormData();
  form.append('image', new Blob([buffer], { type: kind.mime }), `cakehaus-${Date.now()}.${kind.ext}`);
  form.append('name', `cakehaus-${Date.now()}`);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    body: form,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success || !payload.data) {
    const reason = payload?.error?.code === 100 ? 'ImgBB API key ভুল' : payload?.error?.message || 'ImgBB-তে আপলোড ব্যর্থ';
    return fail(reason, 502);
  }
  return json({
    url: payload.data.display_url || payload.data.url,
    size: buffer.byteLength,
    type: kind.ext,
  });
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== 'GET' && hasBadOrigin(request)) {
    return fail('অনুরোধের উৎস সঠিক নয়', 403);
  }

  const pathname = new URL(request.url).pathname.replace(/\/+$/, '');
  const segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const method = request.method;
  const [first, second, third] = segments;

  try {
    if (!first) return json({ ok: true, service: 'cakehaus-api' });

    if (first === 'bootstrap' && method === 'GET') return await bootstrap(context);

    if (first === 'auth') {
      if (second === 'login' && method === 'POST') return await login(context);
      if (second === 'logout' && method === 'POST') return await logout(context);
      if (second === 'password' && method === 'POST') return await changePassword(context);
      if (second === 'me' && method === 'GET') {
        const admin = await currentAdmin(context);
        return json({ admin: admin ? { id: admin.id, username: admin.username } : null });
      }
      return fail('রুট পাওয়া যায়নি', 404);
    }

    if (first === 'orders') {
      if (method === 'POST' && !second) return await createOrder(context);
      if (method === 'GET' && !second) return await listOrders(context);
      if (method === 'GET' && second) return await getOrder(context, second);
      return fail('রুট পাওয়া যায়নি', 404);
    }

    if (first === 'admin') {
      if (second === 'orders' && method === 'GET' && !third) return await adminOrders(context);
      if (second === 'orders' && method === 'PATCH' && third) return await updateOrder(context, third);
      if (second === 'orders' && method === 'DELETE' && third) return await deleteOrder(context, third);
      if (second === 'products' && method === 'PUT') return await saveProducts(context);
      if (second === 'categories' && method === 'PUT') return await saveCategories(context);
      if (second === 'banners' && method === 'PUT') return await saveBanners(context);
      if (second === 'settings' && method === 'PUT') return await saveSettings(context);
      if (second === 'social' && method === 'PUT') return await saveSocial(context);
      return fail('রুট পাওয়া যায়নি', 404);
    }

    if (first === 'upload' && method === 'POST') return await uploadImage(context);

    return fail('রুট পাওয়া যায়নি', 404);
  } catch (err) {
    const status = err?.status || 500;
    if (status === 500) console.error('api error', err);
    return fail(status === 500 ? 'সার্ভারে সমস্যা হয়েছে — আবার চেষ্টা করুন' : err.message, status);
  }
}
