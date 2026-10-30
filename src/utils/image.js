const LOCAL = '/images/';

export function thumb(src, size) {
  if (typeof src !== 'string' || !src.startsWith(LOCAL) || src.startsWith('/images/opt/')) return src;
  return src.replace('/images/', `/images/opt/${size}/`);
}

export function dprSet(src, one, two) {
  if (typeof src !== 'string' || !src.startsWith(LOCAL) || src.startsWith('/images/opt/')) return undefined;
  return `${thumb(src, one)} 1x, ${thumb(src, two)} 2x`;
}
