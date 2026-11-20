import { useState } from 'react';
import { api } from '../../../lib/api.js';
import { useToast } from '../../../lib/toast.jsx';
import { Empty, Field } from '../../../components.jsx';
import { fmtDate } from '../../../lib/format.js';
import { RELEASE_TONE, RELEASE_TYPES } from '../shared.jsx';

// What changed, version by version (products and SaaS).
export default function Releases({ project, canManage, reload }) {
  const toast = useToast();
  const list = [...(project.releases || [])].reverse();
  const [f, setF] = useState({ version: '', type: 'minor', title: '', date: '', notes: '' });
  const [busy, setBusy] = useState(false);
  async function add(e) {
    e.preventDefault();
    setBusy(true);
    try { await api.post(`/flow/projects/${project._id}/releases`, f); toast('Release added'); setF({ version: '', type: 'minor', title: '', date: '', notes: '' }); reload(); } catch (err) { toast(err.message, 'bad'); } finally { setBusy(false); }
  }
  async function remove(r) {
    if (!window.confirm(`Remove release ${r.version}?`)) return;
    try { await api.del(`/flow/projects/${project._id}/releases/${r._id}`); reload(); } catch (err) { toast(err.message, 'bad'); }
  }
  return (
    <div className="stack">
      {canManage && (
        <form className="panel panel-pad stack" onSubmit={add}>
          <h2 style={{ margin: 0 }}>New release</h2>
          <div className="grid2">
            <Field label="Version" hint="For example 1.2.0"><input type="text" value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} required maxLength={20} /></Field>
            <Field label="Type" hint="Major = big change, minor = new features, patch = small fixes, hotfix = urgent fix."><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{Object.entries(RELEASE_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Title"><input type="text" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={100} placeholder="Dark mode and faster reports" /></Field>
            <Field label="Release date" hint="Empty means today."><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          </div>
          <Field label="What changed" hint="One line per change."><textarea rows="4" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} maxLength={3000} /></Field>
          <div><button className="btn primary" disabled={busy}>{busy ? 'Saving...' : 'Publish release'}</button> <span className="muted small">The team gets a notification.</span></div>
        </form>
      )}
      <div className="panel">
        <div className="panel-head"><h2>Release history</h2>{project.version && <span className="chip ok">Current: v{project.version}</span>}</div>
        {list.length === 0 ? <Empty title="No releases yet">Record every version here so the team and customers know what changed and when.</Empty> : list.map((r) => (
          <div className="list-row" key={r._id} style={{ alignItems: 'flex-start' }}>
            <div className="grow">
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}><b>v{r.version}</b><span className={`chip ${RELEASE_TONE[r.type]}`}>{RELEASE_TYPES[r.type]}</span>{r.title && <span>{r.title}</span>}<span className="muted small">{r.date ? fmtDate(r.date, true) : ''}</span></div>
              {r.notes && <p className="release-notes">{r.notes}</p>}
            </div>
            {canManage && <button className="btn sm ghost" onClick={() => remove(r)} aria-label={`Remove ${r.version}`}>Remove</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
