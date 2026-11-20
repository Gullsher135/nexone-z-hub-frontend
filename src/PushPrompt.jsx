import { useEffect, useState } from 'react';
import { useAuth } from './lib/auth.jsx';
import { useToast } from './lib/toast.jsx';
import { NotificationSettings } from './NotificationCenter.jsx';
import { enablePush, isIos, isStandalone, pushState, pushSupported, syncPush } from './lib/push.js';

const DISMISS_KEY = 'nz_push_dismissed_at';
const REASK_AFTER_MS = 3 * 24 * 60 * 60 * 1000; // asked again after 3 days: a missed "Turn on" should not hide it forever

const recentlyDismissed = () => Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < REASK_AFTER_MS;

// Banner at the top of every page: asks to allow notifications (they work even when the site is closed).
export default function PushPrompt() {
  const { user } = useAuth();
  const toast = useToast();
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(recentlyDismissed);
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    if (!user) return;
    syncPush().finally(() => pushState().then(setState));
  }, [user]);

  async function turnOn() {
    setBusy(true);
    try { await enablePush(); toast('Notifications are on'); } catch (e) { toast(e.message, 'bad'); }
    setState(await pushState());
    setBusy(false);
  }
  const hide = () => { localStorage.setItem(DISMISS_KEY, String(Date.now())); setHidden(true); };

  // iPhone/iPad only allow notifications for apps added to the Home Screen.
  if (!pushSupported() && isIos() && !isStandalone() && !hidden) {
    return (
      <div className="alert warn" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="grow">To get notifications on iPhone: tap Share, then "Add to Home Screen", and open NexoneZ from the home screen.</span>
        <button className="btn sm" onClick={hide}>OK</button>
      </div>
    );
  }
  if (state === 'off' && !hidden) {
    return (
      <>
        <div className="alert warn" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="grow">Get notices, tasks and reminders on this device, even when the website is closed.</span>
          <button className="btn sm primary" onClick={turnOn} disabled={busy}>{busy ? 'Turning on...' : 'Turn on notifications'}</button>
          <button className="btn sm" onClick={() => setSettings(true)}>More options</button>
          <button className="btn sm ghost" onClick={hide}>Later</button>
        </div>
        {settings && <NotificationSettings onClose={() => { setSettings(false); pushState().then(setState); }} />}
      </>
    );
  }
  if (state === 'denied' && !hidden) {
    return (
      <div className="alert bad" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="grow">Notifications are blocked for this site. Tap the lock icon next to the address and allow Notifications.</span>
        <button className="btn sm" onClick={hide}>OK</button>
      </div>
    );
  }
  return null;
}
