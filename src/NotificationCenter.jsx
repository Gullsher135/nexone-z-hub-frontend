import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './lib/api.js';
import { useAuth } from './lib/auth.jsx';
import { useToast } from './lib/toast.jsx';
import { Field, Icon, Modal, Spinner } from './components.jsx';
import { refreshUnread, setUnread as shareUnread, watchUnread } from './lib/unread.js';
import { canInstall, disablePush, enablePush, isAndroid, isIos, isStandalone, onInstallChange, promptInstall, pushState, pushSupported } from './lib/push.js';

const ago = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// The bell: unread count, the list of everything that was sent to this person, and the settings.
export function NotificationBell({ variant = 'icon' }) {
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [more, setMore] = useState(false);
  const [settings, setSettings] = useState(false);

  useEffect(() => watchUnread(setUnread), []);
  useEffect(() => { navigator.setAppBadge?.(unread).catch?.(() => {}); if (!unread) navigator.clearAppBadge?.().catch?.(() => {}); }, [unread]);

  async function load(before) {
    const r = await api.get(`/notifications?limit=25${before ? `&before=${encodeURIComponent(before)}` : ''}`).catch(() => null);
    if (!r) return;
    setItems((cur) => (before && cur ? [...cur, ...r.items] : r.items));
    setMore(r.items.length === 25);
    shareUnread(r.unread);
  }
  const toggle = () => { const next = !open; setOpen(next); if (next) load(); };
  async function go(n) {
    setOpen(false);
    if (!n.readAt) api.post(`/notifications/${n._id}/read`).then((r) => shareUnread(r.unread)).catch(() => {});
    if (n.url?.startsWith('/')) nav(n.url);
  }
  async function readAll() { const r = await api.post('/notifications/read-all').catch(() => null); if (r) { shareUnread(0); setItems((cur) => cur?.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))); } }
  async function clear() { if (!window.confirm('Remove all notifications from this list?')) return; await api.del('/notifications').catch(() => {}); setItems([]); shareUnread(0); setMore(false); }

  return (
    <div className="bell-wrap">
      <button type="button" className={variant === 'icon' ? 'icon-btn bell-btn' : 'link-btn small bell-link'} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} onClick={toggle}>
        {variant === 'icon' ? Icon.bell : <>Notifications</>}
        {unread > 0 && <span className="bell-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <>
          <div className="bell-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="bell-panel" role="dialog" aria-label="Notifications">
            <div className="bell-head">
              <b className="grow">Notifications</b>
              {unread > 0 && <button type="button" className="link-btn small" onClick={readAll}>Mark all read</button>}
              <button type="button" className="link-btn small" onClick={() => { setOpen(false); setSettings(true); }}>Settings</button>
            </div>
            <div className="bell-list">
              {items === null ? <div className="bell-empty"><Spinner /></div> : items.length === 0 ? <div className="bell-empty muted small">Nothing yet. Notices, tasks, marks and reminders will show up here.</div> : items.map((n) => (
                <button type="button" key={n._id} className={`bell-item ${n.readAt ? '' : 'unread'}`} onClick={() => go(n)}>
                  <div className="t">{n.title}</div>
                  {n.body && <div className="b">{n.body}</div>}
                  <div className="w">{ago(n.createdAt)}</div>
                </button>
              ))}
              {more && <button type="button" className="bell-item muted small" onClick={() => load(items[items.length - 1].createdAt)}>Show older</button>}
            </div>
            {items?.length > 0 && <div className="bell-head" style={{ borderTop: '1px solid var(--line-2)', borderBottom: 0 }}><span className="grow" /><button type="button" className="link-btn small" onClick={clear}>Clear all</button></div>}
          </div>
        </>
      )}
      {settings && <NotificationSettings onClose={() => setSettings(false)} />}
    </div>
  );
}

// Everything about getting alerts: this device, the other devices, email, and what to do when alerts do not arrive.
export function NotificationSettings({ onClose }) {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [state, setState] = useState(null);
  const [devices, setDevices] = useState(null);
  const [mail, setMail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);
  const [email, setEmail] = useState(user?.contactEmail || '');
  const [emailOn, setEmailOn] = useState(user?.emailNotifications !== false);
  const [installable, setInstallable] = useState(canInstall());

  const loadDevices = useCallback(() => api.get('/push/devices').then((r) => setDevices(r.items)).catch(() => setDevices([])), []);
  useEffect(() => { pushState().then(setState); loadDevices(); api.get('/push/key').then((r) => setMail(!!r.mail)).catch(() => {}); }, [loadDevices]);
  useEffect(() => onInstallChange(() => setInstallable(canInstall())), []);

  async function turnOn() { setBusy(true); try { await enablePush(); toast('Notifications are on for this device'); } catch (e) { toast(e.message, 'bad'); } setState(await pushState()); loadDevices(); setBusy(false); }
  async function turnOff() { setBusy(true); await disablePush(); setState(await pushState()); loadDevices(); setBusy(false); }
  async function test() {
    setBusy(true); setResults(null);
    try { const r = await api.post('/push/test'); setResults(r.devices); if (!r.devices.length) toast('This account has no device yet. Turn notifications on first.', 'bad'); } catch (e) { toast(e.message, 'bad'); }
    setBusy(false); loadDevices();
  }
  async function removeDevice(d) { await api.del(`/push/devices/${d._id}`).catch(() => {}); loadDevices(); }
  async function saveEmail(e) {
    e.preventDefault();
    try { await api.patch('/auth/contact', { contactEmail: email.trim(), emailNotifications: emailOn }); await refresh?.(); toast('Email settings saved'); } catch (err) { toast(err.message, 'bad'); }
  }

  const stateText = { unsupported: 'This browser cannot show alerts', denied: 'Blocked in the browser settings', on: 'On for this device', off: 'Off for this device' }[state] || 'Checking...';
  return (
    <Modal wide title="Notification settings" onClose={onClose} footer={<button className="btn" onClick={onClose}>Done</button>}>
      <div className="stack">
        <div className="panel panel-pad stack">
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <b className="grow">This device</b>
            <span className={`chip ${state === 'on' ? 'ok' : state === 'denied' || state === 'unsupported' ? 'bad' : 'warn'}`}>{stateText}</span>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {(state === 'off') && <button className="btn primary" onClick={turnOn} disabled={busy}>Turn on notifications</button>}
            {state === 'on' && <button className="btn" onClick={turnOff} disabled={busy}>Turn off</button>}
            {state === 'on' && <button className="btn" onClick={test} disabled={busy}>Send me a test</button>}
            {installable && !isStandalone() && <button className="btn" onClick={() => promptInstall()}>Install the app</button>}
          </div>
          {state === 'denied' && <div className="alert warn small">Notifications are blocked. Tap the lock icon next to the address, set Notifications to Allow, then reload.</div>}
          {state === 'unsupported' && isIos() && <div className="alert warn small">On iPhone: tap Share, then Add to Home Screen, and open NexoneZ from the home screen. It needs iOS 16.4 or newer.</div>}
          {results && <div className="stack" style={{ gap: 4 }}>{results.map((r) => <div key={r.id} className="small"><span className={`chip ${r.ok ? 'ok' : 'bad'}`}>{r.ok ? 'Sent' : 'Failed'}</span> {r.label}{r.error ? <span className="muted"> · {r.error}</span> : ''}</div>)}{results.length > 0 && <div className="muted small">Sent means the phone company's push service accepted it. It should appear within seconds.</div>}</div>}
        </div>

        <div className="panel panel-pad stack">
          <b>Your devices</b>
          {devices === null ? <Spinner /> : devices.length === 0 ? <div className="muted small">No device yet.</div> : devices.map((d) => (
            <div className="row small" key={d._id} style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="grow"><b>{d.label || 'Device'}</b> <span className="muted">{d.lastOkAt ? `· last delivered ${ago(d.lastOkAt)}` : '· not used yet'}</span>{d.fails > 2 && <span className="chip bad" style={{ marginLeft: 6 }}>Problem: {d.lastError || 'failing'}</span>}</span>
              <button className="btn sm ghost" onClick={() => removeDevice(d)}>Remove</button>
            </div>
          ))}
        </div>

        <form className="panel panel-pad stack" onSubmit={saveEmail}>
          <b>Email (works even when your phone is off)</b>
          <div className="muted small">Important updates are also emailed, such as notices, tasks, marks, fees and deadlines. You will read them when your phone is back on.</div>
          {!mail && <div className="alert warn small">Email is not connected on the server yet. Ask the admin. Your address is still saved.</div>}
          <Field label="Your own email address" hint="A real mailbox, for example Gmail. Your login email is only an ID."><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" /></Field>
          <label className="check"><input type="checkbox" checked={emailOn} onChange={(e) => setEmailOn(e.target.checked)} />Email me important updates</label>
          <div><button className="btn primary">Save email settings</button></div>
        </form>

        <div className="kind-help">
          <b>If your phone is switched off or has no internet:</b> the alert waits and arrives as soon as the phone is back on (it is kept for up to 4 weeks). It also stays in the bell here, and important ones are emailed.<br /><br />
          <b>If alerts do not arrive on Android:</b> install the app (menu, then Install app), open phone Settings, Apps, NexoneZ (or Chrome), Battery, and choose Unrestricted. Do not swipe the app away with a cleaner or battery saver app, as some phones then block alerts.{isAndroid() ? '' : ''}<br /><br />
          <b>On iPhone:</b> add the site to the Home Screen and open it from there. <b>On a computer:</b> keep Chrome or Edge allowed to run in the background.
          {!pushSupported() && !isIos() && <><br /><br />This browser cannot show alerts. Use Chrome, Edge, Firefox or Safari.</>}
        </div>
      </div>
    </Modal>
  );
}
