import { api, getToken } from './api.js';

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

function keyToBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
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

export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser cannot show notifications.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications were not allowed in the browser.');
  const { enabled, key } = await api.get('/push/key');
  if (!enabled) throw new Error('Notifications are not set up on the server yet.');
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) }));
  await api.post('/push/subscribe', { subscription: sub.toJSON() });
}

export async function disablePush() {
  const sub = await currentSub();
  if (!sub) return;
  await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

// After login on a device that already allowed notifications: link this device to the person logged in now.
export async function syncPush() {
  if ((await pushState()) !== 'on') return;
  const sub = await currentSub();
  if (sub) await api.post('/push/subscribe', { subscription: sub.toJSON() }).catch(() => {});
}

// On logout the device stops receiving the previous person's notifications.
export function forgetPushOnServer() {
  if (!getToken() || !pushSupported()) return;
  currentSub().then((sub) => sub && api.post('/push/unsubscribe', { endpoint: sub.endpoint })).catch(() => {});
}
