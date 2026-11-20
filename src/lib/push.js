import { api, getToken } from './api.js';

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isAndroid = () => /android/i.test(navigator.userAgent);
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

function keyToBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// Keeps the service worker installed every time the site opens, so alerts can arrive while the site is closed.
export function registerWorker() {
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

async function currentSub() {
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
}

// 'unsupported' | 'denied' | 'on' | 'off'
export async function pushState() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'off';
  return (await currentSub()) ? 'on' : 'off';
}

// Creates (or reuses) this device's subscription and tells the server who it belongs to.
async function subscribeNow() {
  const { enabled, key } = await api.get('/push/key');
  if (!enabled) throw new Error('Notifications are not set up on the server yet.');
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) }));
  await api.post('/push/subscribe', { subscription: sub.toJSON() });
  return sub;
}

export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser cannot show notifications.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications were not allowed in the browser.');
  await subscribeNow();
}

export async function disablePush() {
  const sub = await currentSub();
  if (!sub) return;
  await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

// Every time the app opens for a person who already allowed notifications: link this device to them and
// quietly make a new subscription if the browser dropped the old one (this happens now and then).
export async function syncPush() {
  if (!pushSupported() || Notification.permission !== 'granted' || !getToken()) return;
  try { await subscribeNow(); } catch { /* try again next time */ }
}

// On logout the device stops receiving the previous person's notifications.
export function forgetPushOnServer() {
  if (!getToken() || !pushSupported()) return;
  currentSub().then((sub) => sub && api.post('/push/unsubscribe', { endpoint: sub.endpoint })).catch(() => {});
}

// ---- "Install the app" (an installed app is much more reliable for alerts than a browser tab) ----
let deferred = null;
const listeners = new Set();
const ping = () => listeners.forEach((f) => f());
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; ping(); });
  window.addEventListener('appinstalled', () => { deferred = null; ping(); });
}
export const canInstall = () => !!deferred;
export const onInstallChange = (f) => { listeners.add(f); return () => listeners.delete(f); };
export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const r = await deferred.userChoice.catch(() => ({ outcome: 'dismissed' }));
  deferred = null;
  ping();
  return r.outcome === 'accepted';
}
