import { useEffect, useState } from 'react';
import { useAuth } from './lib/auth.jsx';
import { api } from './lib/api.js';
import { useToast } from './lib/toast.jsx';
import { disablePush, enablePush, isIos, isStandalone, pushState, pushSupported, syncPush } from './lib/push.js';

const DISMISS_KEY = 'nz_push_dismissed';

// Small banner at the top of every page: asks once to allow notifications (works even when the site is closed).
export default function PushPrompt() {
  const { user } = useAuth();
  const toast = useToast();
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

  useEffect(() => {
    if (!user) return;
    pushState().then((s) => { setState(s); if (s === 'on') syncPush(); });
  }, [user]);

  async function turnOn() {
    setBusy(true);
    try { await enablePush(); setState('on'); toast('Notifications are on'); } catch (e) { toast(e.message, 'bad'); setState(await pushState()); } finally { setBusy(false); }
  }
  async function turnOff() {
    setBusy(true);
    await disablePush();
    setState(await pushState());
    localStorage.removeItem(DISMISS_KEY);
    setBusy(false);
  }
  async function sendTest() {
    setBusy(true);
    try {
      await syncPush();
      const r = await api.post('/push/test', {});
      if (!r.devices) toast('Server has no device saved for this login. Turn notifications off and on again.', 'bad');
      else if (r.errors?.length) toast(`Push failed: ${r.errors[0]}`, 'bad');
      else toast('Test sent. Close the website and check your phone.');
    } catch (e) { toast(e.message, 'bad'); } finally { setBusy(false); }
  }
  const hide = () => { localStorage.setItem(DISMISS_KEY, '1'); setDismissed(true); };

  // iPhone/iPad only allow notifications for apps added to the Home Screen.
  if (!pushSupported() && isIos() && !isStandalone() && !dismissed) {
    return (
      <div className="alert warn" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="grow">To get notifications on iPhone: tap Share, then "Add to Home Screen", and open NexoneZ from the home screen.</span>
        <button className="btn sm" onClick={hide}>OK</button>
      </div>
    );
  }
  if (state === 'off' && !dismissed) {
    return (
      <div className="alert warn" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="grow">Get notices and announcements on this device, even when the website is closed.</span>
        <button className="btn sm primary" onClick={turnOn} disabled={busy}>{busy ? 'Turning on...' : 'Turn on notifications'}</button>
        <button className="btn sm" onClick={hide}>Not now</button>
      </div>
    );
  }
  if (state === 'on') {
    return <div className="muted small" style={{ marginBottom: 10, textAlign: 'right' }}>Notifications are on for this device. <button className="link-btn small" onClick={sendTest} disabled={busy}>Send test</button> · <button className="link-btn small" onClick={turnOff} disabled={busy}>Turn off</button></div>;
  }
  return null;
}
