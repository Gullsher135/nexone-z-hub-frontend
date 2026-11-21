import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useAsync } from '../../lib/useAsync.js';
import { useToast } from '../../lib/toast.jsx';
import { Empty, Loading } from '../../components.jsx';

const ROLE = { student: 'Students', employee: 'Employees', intern: 'Interns', teacher: 'Teachers', admin: 'Admins' };

const Check = ({ ok, title, fix }) => (
  <div className="list-row" style={{ alignItems: 'flex-start' }}>
    <span className={`chip ${ok ? 'ok' : 'bad'}`}>{ok ? 'Ready' : 'Missing'}</span>
    <div className="grow"><b>{title}</b>{!ok && <div className="muted small">{fix}</div>}</div>
  </div>
);

// Admin: is everything connected, and who will actually receive notifications?
export default function NotificationHealth() {
  const toast = useToast();
  const state = useAsync(() => api.get('/push/health'), []);
  const [role, setRole] = useState('');
  const d = state.data;
  const missing = (d?.missing || []).filter((m) => !role || m.role === role);
  async function test() {
    try { const r = await api.post('/push/test'); toast(r.devices.length ? `${r.sent} of ${r.devices.length} of your devices got it` : 'You have no device yet. Turn on notifications from the bell, Settings.', r.sent ? 'ok' : 'bad'); } catch (e) { toast(e.message, 'bad'); }
  }
  return (
    <>
      <div className="page-head"><div><h1>Notification health</h1><p className="sub">Check that everything is connected and see who will actually get notifications.</p></div><button className="btn" onClick={test}>Send a test to my devices</button></div>
      <Loading state={state}>
        {d && (
          <div className="stack">
            <div className="panel">
              <div className="panel-head"><h2>Server speed</h2></div>
              <div className="list-row" style={{ alignItems: 'flex-start' }}>
                <span className={`chip ${d.perf.dbPingMs == null ? 'bad' : d.perf.dbPingMs < 60 ? 'ok' : d.perf.dbPingMs < 150 ? 'warn' : 'bad'}`}>{d.perf.dbPingMs == null ? 'Unknown' : `${d.perf.dbPingMs} ms`}</span>
                <div className="grow"><b>Database answer time</b><div className="muted small">Under 60 ms is good. Above 150 ms means the server and the database are in different parts of the world: put both in the same region (for example both in Singapore or both in Frankfurt). Every page makes several database calls, so this number multiplies.</div></div>
              </div>
              <div className="list-row" style={{ alignItems: 'flex-start' }}>
                <span className={`chip ${d.perf.uptimeMinutes < 10 ? 'warn' : 'ok'}`}>{d.perf.uptimeMinutes} min</span>
                <div className="grow"><b>Server has been awake for</b><div className="muted small">If this number is small every time you look, the free server keeps going to sleep (the first page then takes up to a minute). Fix: a free timer at cron-job.org that opens /api/health every 10 minutes.</div></div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><h2>Connections</h2></div>
              <Check ok={d.config.push} title="Phone and computer alerts (push)" fix="Run npm run vapid and add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to the server settings." />
              <Check ok={d.config.email} title={`Email for people whose phone is off${d.config.emailFrom ? ` (from ${d.config.emailFrom})` : ''}`} fix="Make a free Brevo account, verify a sender email, then add BREVO_API_KEY and MAIL_FROM_EMAIL to the server settings." />
              <Check ok={d.config.cron} title="Daily reminders timer" fix="Add CRON_KEY to the server settings, then call /api/cron/reminders?key=... once a day from cron-job.org (it also keeps the free server awake)." />
              <div className="list-row"><span className="chip muted">Info</span><div className="grow"><b>Files are stored in {d.config.fileStorage === 'bucket' ? 'free object storage' : 'the database'}</b></div></div>
            </div>

            <div className="panel">
              <div className="panel-head"><h2>Who has notifications on</h2></div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Group</th><th>People</th><th>Phone/computer alerts</th><th>Email address</th></tr></thead>
                  <tbody>
                    {Object.entries(d.roles).map(([r, v]) => (
                      <tr key={r}>
                        <td>{ROLE[r] || r}</td><td>{v.people}</td>
                        <td>{v.withDevice} <span className="muted small">({v.people ? Math.round((v.withDevice / v.people) * 100) : 0}%)</span></td>
                        <td>{v.withEmail} <span className="muted small">({v.people ? Math.round((v.withEmail / v.people) * 100) : 0}%)</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {d.failing.length > 0 && (
              <div className="panel">
                <div className="panel-head"><h2>Devices that keep failing</h2></div>
                {d.failing.map((f) => <div className="list-row" key={f._id}><div className="grow"><b>{f.name}</b> <span className="muted small">{f.code} · {ROLE[f.role] || f.role}</span></div><span className="chip bad">{f.devices} device{f.devices > 1 ? 's' : ''} failing</span></div>)}
                <div className="panel-pad muted small">They need to open the site once, then Notification settings, then turn notifications off and on again.</div>
              </div>
            )}

            <div className="panel">
              <div className="panel-head"><h2>No device yet ({d.missingTotal})</h2><select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Group" style={{ width: 'auto' }}><option value="">Everyone</option>{Object.keys(d.roles).map((r) => <option key={r} value={r}>{ROLE[r] || r}</option>)}</select></div>
              {missing.length === 0 ? <Empty title="Everyone has a device">Nobody is missing in this group.</Empty> : missing.map((m) => (
                <div className="list-row" key={m._id}><div className="grow"><b>{m.name}</b> <span className="muted small">{m.code} · {ROLE[m.role] || m.role}</span></div>{m.hasEmail ? <span className="chip ok">Has email</span> : <span className="chip warn">No email</span>}</div>
              ))}
              <div className="panel-pad muted small">These people have not allowed notifications on any device, so they only see updates when they open the site (and by email if they have an address). Ask them to open the site and tap Turn on notifications.</div>
            </div>
          </div>
        )}
      </Loading>
    </>
  );
}
