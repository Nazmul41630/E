const BASE = '/api';

let bootstrapCache = null;
let bootstrapPromise = null;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function notify(message, tone = 'error') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('cakehaus:toast', { detail: { message, tone } }));
}

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('সার্ভারের সাথে সংযোগ করা যায়নি', 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new CustomEvent('cakehaus:unauthorized'));
    throw new ApiError(data?.error || 'অনুরোধটি সম্পন্ন হয়নি', res.status);
  }
  return data;
}

export function loadBootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = api('/bootstrap')
      .then((data) => {
        bootstrapCache = data;
        return data;
      })
      .catch((err) => {
        bootstrapPromise = null;
        throw err;
      });
  }
  return bootstrapPromise;
}

export function peekBootstrap() {
  return bootstrapCache;
}

export function refreshBootstrap() {
  bootstrapPromise = null;
  return loadBootstrap();
}

export async function uploadImage(file) {
  let res;
  try {
    res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': file.type || 'application/octet-stream' },
      body: file,
    });
  } catch {
    throw new ApiError('সার্ভারের সাথে সংযোগ করা যায়নি', 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.url) {
    if (res.status === 401) window.dispatchEvent(new CustomEvent('cakehaus:unauthorized'));
    throw new ApiError(data?.error || 'আপলোড ব্যর্থ হয়েছে', res.status);
  }
  return data.url;
}
