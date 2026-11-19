import { useState } from 'react';
import { api, qs } from '../../lib/api.js';
import { useAsync } from '../../lib/useAsync.js';
import { Empty, Loading } from '../../components.jsx';

const KINDS = [
  ['', 'Everything'], ['payment', 'Fee payments'], ['fee', 'Fee plans'], ['salary', 'Salaries'], ['payroll', 'Payroll run'], ['payslip', 'Payslips'],
  ['attendance', 'Staff attendance edits'], ['studentAttendance', 'Class attendance'], ['grade', 'Marks and grades'], ['user', 'Accounts and passwords'],
];
const when = (d) => new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' });

function Row({ a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="list-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
      <div className="grow" style={{ minWidth: 220 }}>
        <div>{a.summary}</div>
        <div className="muted small">{when(a.createdAt)} · by <b>{a.actorName || 'Unknown'}</b> ({a.actorRole || '?'}) · <code>{a.action}</code></div>
        {open && a.details && <pre className="code-block" style={{ marginTop: 8 }}>{JSON.stringify(a.details, null, 2)}</pre>}
      </div>
      {a.details && <button className="btn sm ghost" onClick={() => setOpen(!open)}>{open ? 'Hide details' : 'Details'}</button>}
    </div>
  );
}

export default function AuditLog() {
  const [kind, setKind] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const state = useAsync(() => api.get(`/audit${qs({ action: kind, from, to, page })}`), [kind, from, to, page]);
  const d = state.data;
  const reset = (fn) => (e) => { fn(e.target.value); setPage(1); };
  return (
    <div className="stack">
      <div><h1 className="page-title">Audit log</h1><p className="muted">A permanent record of who changed money, marks, attendance and accounts, and when. Entries cannot be edited.</p></div>
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <select value={kind} onChange={reset(setKind)} aria-label="What changed">{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <label className="small row" style={{ gap: 6 }}>From <input type="date" value={from} onChange={reset(setFrom)} /></label>
        <label className="small row" style={{ gap: 6 }}>To <input type="date" value={to} onChange={reset(setTo)} /></label>
        {(kind || from || to) && <button className="btn sm ghost" onClick={() => { setKind(''); setFrom(''); setTo(''); setPage(1); }}>Clear</button>}
      </div>
      <Loading state={state}>
        {d && (d.items.length === 0 ? <div className="panel"><Empty title="Nothing recorded">No actions match these filters.</Empty></div> : (
          <>
            <div className="panel">{d.items.map((a) => <Row key={a._id} a={a} />)}</div>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</button>
              <span className="muted small">Page {d.page} of {d.pages} · {d.total} entries</span>
              <button className="btn" disabled={page >= d.pages} onClick={() => setPage(page + 1)}>Older</button>
            </div>
          </>
        ))}
      </Loading>
    </div>
  );
}
