import { api, getToken } from './api.js';

// One shared check for the unread count (the bell appears twice on some screens), only while the page is visible.
let count = 0;
let timer = null;
const subs = new Set();
const emit = () => subs.forEach((f) => f(count));

export const setUnread = (n) => { count = n; emit(); };
export async function refreshUnread() {
  if (!getToken() || document.visibilityState !== 'visible') return;
  try { setUnread((await api.get('/notifications/unread')).unread); } catch { /* try again later */ }
}
const onShow = () => refreshUnread();

export function watchUnread(fn) {
  subs.add(fn);
  fn(count);
  if (!timer) {
    refreshUnread();
    timer = setInterval(refreshUnread, 90000);
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', onShow);
  }
  return () => {
    subs.delete(fn);
    if (!subs.size && timer) { clearInterval(timer); timer = null; document.removeEventListener('visibilitychange', onShow); window.removeEventListener('focus', onShow); }
  };
}
