import { useState } from 'react';
import { api } from '../../../lib/api.js';
import { useToast } from '../../../lib/toast.jsx';
import { Field } from '../../../components.jsx';

const KINDS = { repo: 'Code repository', design: 'Design', doc: 'Document', staging: 'Staging site', production: 'Live site', other: 'Other' };

function Links({ project, canManage, reload }) {
  const toast = useToast();
  const links = project.links || [];
  const [f, setF] = useState({ kind: 'doc', title: '', url: '' });
  async function save(list) {
    try { await api.put(`/flow/projects/${project._id}/links`, { links: list }); reload(); return true; } catch (e) { toast(e.message, 'bad'); return false; }
  }
  async function add(e) {
    e.preventDefault();
    if (await save([...links, { kind: f.kind, title: f.title.trim(), url: f.url.trim() }])) setF({ ...f, title: '', url: '' });
  }
  return (
    <div className="panel">
      <div className="panel-head"><h2>Links and documents</h2></div>
      {links.length === 0 && <div className="panel-pad muted small">No links yet. Add the repository, design files, documents and the staging or live site.</div>}
      {links.map((l, n) => (
        <div className="list-row" key={l._id || n}>
          <span className="chip muted">{KINDS[l.kind] || 'Other'}</span>
          <a className="grow" href={l.url} target="_blank" rel="noopener noreferrer">{l.title || l.url}</a>
          {canManage && <button className="btn sm ghost" onClick={() => save(links.filter((_, i) => i !== n))} aria-label={`Remove ${l.title || l.url}`}>Remove</button>}
        </div>
      ))}
      {canManage && (
        <form className="panel-pad row" onSubmit={add} style={{ flexWrap: 'wrap', borderTop: '1px solid var(--line-2)' }}>
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} aria-label="Kind" style={{ width: 'auto' }}>{Object.entries(KINDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <input type="text" placeholder="Name" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={80} style={{ width: 180 }} aria-label="Name" />
          <input type="text" inputMode="url" className="grow" placeholder="https://" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} required aria-label="Address" style={{ minWidth: 200 }} />
          <button className="btn primary">Add link</button>
        </form>
      )}
    </div>
  );
}

// Admin only: a read-only progress page the client can open without an account.
function Sharing({ project, reload }) {
  const toast = useToast();
  const share = project.share || {};
  const url = share.token ? `${window.location.origin}/share/${share.token}` : '';
  async function update(body, message) {
    try { await api.post(`/flow/projects/${project._id}/share`, body); toast(message); reload(); } catch (e) { toast(e.message, 'bad'); }
  }
  return (
    <div className="panel panel-pad stack">
      <div><h2 style={{ margin: 0 }}>Share progress with the client</h2><p className="muted small" style={{ margin: '4px 0 0' }}>Anyone with the link can see overall progress and milestones. They never see the budget, your team, comments, hours or internal links.</p></div>
      <label className="check"><input type="checkbox" checked={!!share.enabled} onChange={(e) => update({ enabled: e.target.checked }, e.target.checked ? 'Sharing is on' : 'Sharing is off')} /> Sharing is {share.enabled ? 'on' : 'off'}</label>
      {share.enabled && url && (
        <>
          <Field label="Client link"><div className="row"><input type="text" readOnly value={url} className="grow" onFocus={(e) => e.target.select()} aria-label="Client link" /><button className="btn" onClick={() => { navigator.clipboard?.writeText(url); toast('Link copied'); }}>Copy</button></div></Field>
          <label className="check"><input type="checkbox" checked={!!share.showTasks} onChange={(e) => update({ showTasks: e.target.checked }, 'Saved')} /> Also show the list of cards (titles and status only)</label>
          <div><button className="btn sm ghost" onClick={() => window.confirm('Make a new link? The old link will stop working.') && update({ regenerate: true }, 'New link created')}>Create a new link</button></div>
        </>
      )}
    </div>
  );
}

export default function LinksShare({ project, canManage, admin, reload }) {
  return (
    <div className="stack">
      <Links project={project} canManage={canManage} reload={reload} />
      {admin && <Sharing project={project} reload={reload} />}
    </div>
  );
}
