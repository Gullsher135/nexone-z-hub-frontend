import { useState } from 'react';
import { api } from '../../../lib/api.js';
import { useToast } from '../../../lib/toast.jsx';
import { Empty, Field, Modal, ProgressBar } from '../../../components.jsx';
import { fmtDate } from '../../../lib/format.js';

function MilestoneForm({ project, milestone, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ name: milestone?.name || '', description: milestone?.description || '', dueDate: milestone?.dueDate || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const body = { ...f, dueDate: f.dueDate || null };
      if (milestone) await api.patch(`/flow/projects/${project._id}/milestones/${milestone._id}`, body); else await api.post(`/flow/projects/${project._id}/milestones`, body);
      toast('Milestone saved'); onSaved();
    } catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title={milestone ? 'Edit milestone' : 'New milestone'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" form="ms-form" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button></>}>
      <form id="ms-form" className="stack" onSubmit={save}>
        {error && <div className="alert bad" role="alert">{error}</div>}
        <Field label="Name"><input type="text" value={f.name} onChange={set('name')} required autoFocus maxLength={100} placeholder="Design approved" /></Field>
        <Field label="Date" hint="When this phase should be finished."><input type="date" value={f.dueDate} onChange={set('dueDate')} /></Field>
        <Field label="Notes"><textarea rows="3" value={f.description} onChange={set('description')} maxLength={500} /></Field>
      </form>
    </Modal>
  );
}

// Phases of the project. Cards are attached to a milestone from the card itself.
export default function Milestones({ project, health, canManage, reload }) {
  const toast = useToast();
  const [editing, setEditing] = useState(null); // null | 'new' | milestone
  const list = health.milestones;
  async function toggle(m) {
    try { await api.patch(`/flow/projects/${project._id}/milestones/${m._id}`, { done: !m.doneAt }); reload(); } catch (e) { toast(e.message, 'bad'); }
  }
  async function remove(m) {
    if (!window.confirm(`Delete the milestone "${m.name}"? Its cards stay on the board.`)) return;
    try { await api.del(`/flow/projects/${project._id}/milestones/${m._id}`); toast('Milestone deleted'); reload(); } catch (e) { toast(e.message, 'bad'); }
  }
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <div className="grow muted">Split the project into phases. A milestone is complete when its cards are done, or when you mark it done yourself.</div>
        {canManage && <button className="btn primary" onClick={() => setEditing('new')}>New milestone</button>}
      </div>
      {list.length === 0 ? <div className="panel"><Empty title="No milestones yet">{canManage ? 'Add one, then attach cards to it from the card.' : 'The project lead has not added any yet.'}</Empty></div> : (
        <div className="panel">
          {list.map((m) => (
            <div className="list-row" key={m._id} style={{ flexWrap: 'wrap' }}>
              <div className="grow" style={{ minWidth: 200 }}>
                <b>{m.name}</b>
                <div className="muted small">{m.dueDate ? `Due ${fmtDate(m.dueDate, true)}` : 'No date'} · {m.done} of {m.total} cards done</div>
                {m.description && <div className="small" style={{ marginTop: 4 }}>{m.description}</div>}
              </div>
              <div style={{ width: 140 }}><ProgressBar value={m.percent} label={`${m.name} progress`} /></div>
              <span className={`chip ${m.complete ? 'ok' : m.overdue ? 'bad' : 'muted'}`}>{m.complete ? 'Done' : m.overdue ? 'Late' : 'Open'}</span>
              {canManage && (
                <span className="row" style={{ gap: 6 }}>
                  <button className="btn sm" onClick={() => toggle(m)}>{m.doneAt ? 'Reopen' : 'Mark done'}</button>
                  <button className="btn sm" onClick={() => setEditing(project.milestones.find((x) => x._id === m._id) || m)}>Edit</button>
                  <button className="btn sm ghost" onClick={() => remove(m)}>Delete</button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {editing && <MilestoneForm project={project} milestone={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </>
  );
}
