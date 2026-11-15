import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api.js';
import { useToast } from '../../../lib/toast.jsx';
import { Field, Modal, ProgressBar } from '../../../components.jsx';
import { fmtDate } from '../../../lib/format.js';
import { isBlocked, localToday } from '../../../lib/flowView.js';
import { COLUMNS, PRIORITIES, PRIORITY_TONE, TYPES, TypeChip, hoursText, isLate, when } from '../shared.jsx';

const draftOf = (item, initial) => ({
  title: item?.title || '', description: item?.description || '', type: item?.type || 'task', priority: item?.priority || 'medium',
  assignee: item?.assignee?._id || '', startDate: item?.startDate || '', dueDate: item?.dueDate || initial?.dueDate || '',
  milestone: item?.milestone || '', labels: (item?.labels || []).join(', '), estimateHours: item?.estimateHours ?? '',
  blockedBy: (item?.blockedBy || []).map((b) => b._id),
});

const toBody = (d) => ({
  title: d.title, description: d.description, type: d.type, priority: d.priority, assignee: d.assignee || null,
  startDate: d.startDate || null, dueDate: d.dueDate || null, milestone: d.milestone || null,
  labels: d.labels.split(',').map((s) => s.trim()).filter(Boolean),
  estimateHours: d.estimateHours === '' ? null : Number(d.estimateHours), blockedBy: d.blockedBy,
});

function Checklist({ list, editable, onChange }) {
  const [text, setText] = useState('');
  const done = list.filter((c) => c.done).length;
  const add = (e) => { e.preventDefault(); if (!text.trim()) return; onChange([...list, { text: text.trim(), done: false }]); setText(''); };
  return (
    <div className="tm-section">
      <div className="row"><b className="grow">Checklist</b>{list.length > 0 && <span className="muted small">{done} of {list.length}</span>}</div>
      {list.length > 0 && <ProgressBar value={Math.round((done / list.length) * 100)} label="Checklist progress" />}
      {list.map((c, n) => (
        <div className="tm-check" key={c._id || n}>
          <label className="check grow"><input type="checkbox" checked={c.done} disabled={!editable} onChange={() => onChange(list.map((x, i) => (i === n ? { ...x, done: !x.done } : x)))} /><span className={c.done ? 'tm-done' : ''}>{c.text}</span></label>
          {editable && <button type="button" className="btn ghost sm" aria-label={`Remove ${c.text}`} onClick={() => onChange(list.filter((_, i) => i !== n))}>Remove</button>}
        </div>
      ))}
      {editable && (
        <form className="row" onSubmit={add}>
          <input type="text" className="grow" placeholder="Add a step" value={text} onChange={(e) => setText(e.target.value)} maxLength={140} aria-label="New checklist step" />
          <button className="btn sm">Add</button>
        </form>
      )}
      {!editable && list.length === 0 && <div className="muted small">No steps.</div>}
    </div>
  );
}

function LinkList({ list, editable, onChange }) {
  const [f, setF] = useState({ title: '', url: '' });
  const add = (e) => { e.preventDefault(); if (!f.url.trim()) return; onChange([...list, { title: f.title.trim(), url: f.url.trim() }]); setF({ title: '', url: '' }); };
  return (
    <div className="tm-section">
      <b>Links and files</b>
      {list.length === 0 && <div className="muted small">Nothing attached.</div>}
      {list.map((l, n) => (
        <div className="tm-check" key={l._id || n}>
          <a className="grow" href={l.url} target="_blank" rel="noopener noreferrer">{l.title || l.url}</a>
          {editable && <button type="button" className="btn ghost sm" aria-label={`Remove ${l.title || l.url}`} onClick={() => onChange(list.filter((_, i) => i !== n))}>Remove</button>}
        </div>
      ))}
      {editable && (
        <form className="row" onSubmit={add} style={{ flexWrap: 'wrap' }}>
          <input type="text" placeholder="Name (optional)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={80} style={{ width: 150 }} aria-label="Link name" />
          <input type="text" inputMode="url" className="grow" placeholder="https://" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} aria-label="Link address" />
          <button className="btn sm">Add</button>
        </form>
      )}
    </div>
  );
}

function TimeLog({ item, canLog, canManage, me, onChanged }) {
  const toast = useToast();
  const [f, setF] = useState({ hours: '', note: '', date: localToday() });
  async function log(e) {
    e.preventDefault();
    try { await api.post(`/flow/items/${item._id}/time`, f); setF({ hours: '', note: '', date: localToday() }); onChanged(); } catch (err) { toast(err.message, 'bad'); }
  }
  async function remove(id) {
    try { await api.del(`/flow/items/${item._id}/time/${id}`); onChanged(); } catch (err) { toast(err.message, 'bad'); }
  }
  const est = item.estimateHours;
  return (
    <div className="tm-section">
      <div className="row"><b className="grow">Time</b><span className="muted small">{hoursText(item.loggedHours)} logged{est ? ` of ${hoursText(est)} estimated` : ''}</span></div>
      {est > 0 && <ProgressBar value={Math.min(100, Math.round(((item.loggedHours || 0) / est) * 100))} label="Time used" />}
      {(item.loggedHours || 0) > (est || Infinity) && <div className="small late-t">Over the estimate by {hoursText(item.loggedHours - est)}.</div>}
      {(item.timeLogs || []).slice().reverse().map((l) => (
        <div className="tm-check" key={l._id}>
          <span className="grow small"><b>{hoursText(l.hours)}</b> · {l.user?.name || 'Someone'} · {fmtDate(l.date)}{l.note ? ` · ${l.note}` : ''}</span>
          {(l.user?._id === me || canManage) && <button type="button" className="btn ghost sm" aria-label="Remove time entry" onClick={() => remove(l._id)}>Remove</button>}
        </div>
      ))}
      {canLog && (
        <form className="row" onSubmit={log} style={{ flexWrap: 'wrap' }}>
          <input type="number" min="0.1" max="24" step="any" placeholder="Hours" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} style={{ width: 90 }} aria-label="Hours worked" required />
          <input type="date" value={f.date} max={localToday()} onChange={(e) => setF({ ...f, date: e.target.value })} aria-label="Date" style={{ width: 150 }} />
          <input type="text" className="grow" placeholder="What did you do? (optional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={200} aria-label="Note" />
          <button className="btn sm">Log time</button>
        </form>
      )}
    </div>
  );
}

function Discussion({ item, onChanged }) {
  const toast = useToast();
  const [tab, setTab] = useState('comments');
  const [text, setText] = useState('');
  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try { await api.post(`/flow/items/${item._id}/comments`, { text }); setText(''); onChanged(); } catch (err) { toast(err.message, 'bad'); }
  }
  const activity = (item.activity || []).slice().reverse();
  return (
    <div className="tm-section">
      <div className="seg" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'comments'} className={tab === 'comments' ? 'on' : ''} onClick={() => setTab('comments')}>Comments ({item.comments.length})</button>
        <button type="button" role="tab" aria-selected={tab === 'activity'} className={tab === 'activity' ? 'on' : ''} onClick={() => setTab('activity')}>History ({activity.length})</button>
      </div>
      {tab === 'comments' ? (
        <div className="comments" style={{ borderTop: 0, paddingTop: 0 }}>
          {item.comments.map((c) => <div key={c._id} className="comment"><b>{c.author?.name || 'Someone'}</b> <span className="muted small">{when(c.at)}</span><div>{c.text}</div></div>)}
          <form className="row" onSubmit={send}><input type="text" className="grow" placeholder="Add an update" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} aria-label="Comment" /><button className="btn sm">Send</button></form>
        </div>
      ) : (
        <div className="tm-history">
          {activity.length === 0 && <div className="muted small">No history yet.</div>}
          {activity.map((a) => <div key={a._id} className="small"><b>{a.user?.name || 'Someone'}</b> {a.text} <span className="muted">· {when(a.at)}</span></div>)}
        </div>
      )}
    </div>
  );
}

// One modal for everything about a card: create it, read it, and (for those allowed) change it.
// `item` is null when creating. Lead/admin edit every field; the assignee ticks the checklist, adds links, logs time and moves the card.
export default function TaskModal({ project, items, item, initial, canManage, me, onClose, onChanged }) {
  const toast = useToast();
  const creating = !item;
  const mine = !!item && item.assignee?._id === me;
  const canWork = canManage || mine;
  const team = [...(project.lead ? [project.lead] : []), ...project.members.filter((m) => m._id !== project.lead?._id)];
  const milestones = project.milestones || [];
  const base = useMemo(() => draftOf(item, initial), [item, initial]);
  const [d, setD] = useState(base);
  // Checklist and links show the change at once and save in the background (they are rolled back if saving fails).
  const [checklist, setChecklist] = useState(item?.checklist || []);
  const [links, setLinks] = useState(item?.links || []);
  const serverChecklist = JSON.stringify(item?.checklist || []);
  const serverLinks = JSON.stringify(item?.links || []);
  useEffect(() => { if (item) setChecklist(item.checklist || []); }, [serverChecklist]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (item) setLinks(item.links || []); }, [serverLinks]); // eslint-disable-line react-hooks/exhaustive-deps
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dirty = creating || JSON.stringify(d) !== JSON.stringify(base);
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const others = items.filter((i) => i._id !== item?._id);
  const milestoneName = milestones.find((m) => m._id === item?.milestone)?.name;

  async function save(e) {
    e?.preventDefault();
    setBusy(true); setError('');
    try {
      if (creating) await api.post(`/flow/projects/${project._id}/items`, { ...toBody(d), checklist, links });
      else await api.patch(`/flow/items/${item._id}`, toBody(d));
      toast(creating ? 'Card added' : 'Card saved');
      onChanged();
      if (creating) onClose(); else setBusy(false);
    } catch (err) { setError(err.message); setBusy(false); }
  }
  async function persist(partial, rollback) {
    try { await api.patch(`/flow/items/${item._id}`, partial); onChanged(); } catch (err) { toast(err.message, 'bad'); rollback?.(); }
  }
  async function move(status) {
    try { await api.post(`/flow/items/${item._id}/status`, { status }); onChanged(); } catch (err) { toast(err.message, 'bad'); }
  }
  async function remove() {
    if (!window.confirm('Delete this card?')) return;
    try { await api.del(`/flow/items/${item._id}`); onChanged(); onClose(); } catch (err) { toast(err.message, 'bad'); }
  }
  const toggleBlocker = (id) => setD({ ...d, blockedBy: d.blockedBy.includes(id) ? d.blockedBy.filter((x) => x !== id) : [...d.blockedBy, id] });

  const footer = canManage && (
    <>
      {!creating && <button type="button" className="btn ghost" onClick={remove}>Delete</button>}
      <button type="button" className="btn" onClick={onClose}>{creating ? 'Cancel' : 'Close'}</button>
      <button type="button" className="btn primary" onClick={save} disabled={busy || !dirty || !d.title.trim()}>{busy ? 'Saving...' : creating ? 'Add card' : 'Save changes'}</button>
    </>
  );

  return (
    <Modal wide title={creating ? 'New card' : item.title} onClose={onClose} footer={footer}>
      <div className="tm-grid">
        <div className="tm-main stack">
          {error && <div className="alert bad" role="alert">{error}</div>}
          {!creating && (
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <TypeChip type={item.type} />
              <span className={`chip ${PRIORITY_TONE[item.priority]}`}>{PRIORITIES[item.priority]} priority</span>
              {isLate(item.dueDate, item.status) && <span className="chip bad">Overdue</span>}
              {isBlocked(item) && <span className="chip warn">Waiting on another card</span>}
              {milestoneName && <span className="chip muted">{milestoneName}</span>}
              {(item.labels || []).map((l) => <span key={l} className="tag">{l}</span>)}
            </div>
          )}
          {canManage && <Field label="Title"><input type="text" value={d.title} onChange={set('title')} maxLength={160} autoFocus={creating} /></Field>}
          {canManage
            ? <Field label="Details"><textarea rows="4" value={d.description} onChange={set('description')} /></Field>
            : item.description && <p className="prose small" style={{ margin: 0 }}>{item.description}</p>}

          {!creating && canWork && (
            <div><div className="muted small" style={{ marginBottom: 6 }}>Status</div><div className="seg">{COLUMNS.map((c) => <button key={c.key} type="button" className={item.status === c.key ? 'on' : ''} onClick={() => item.status !== c.key && move(c.key)}>{c.label}</button>)}</div></div>
          )}

          <Checklist list={checklist} editable={creating ? canManage : canWork} onChange={(list) => { const before = checklist; setChecklist(list); if (!creating) persist({ checklist: list }, () => setChecklist(before)); }} />
          <LinkList list={links} editable={creating ? canManage : canWork} onChange={(list) => { const before = links; setLinks(list); if (!creating) persist({ links: list }, () => setLinks(before)); }} />
          {!creating && <TimeLog item={item} canLog={canWork} canManage={canManage} me={me} onChanged={onChanged} />}
          {!creating && <Discussion item={item} onChanged={onChanged} />}
        </div>

        <aside className="tm-side stack">
          {canManage ? (
            <>
              <Field label="Assign to"><select value={d.assignee} onChange={set('assignee')}><option value="">Nobody yet</option>{team.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}</select></Field>
              <Field label="Type"><select value={d.type} onChange={set('type')}>{Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              <Field label="Priority"><select value={d.priority} onChange={set('priority')}>{Object.entries(PRIORITIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
              <Field label="Start date"><input type="date" value={d.startDate} onChange={set('startDate')} /></Field>
              <Field label="Due date"><input type="date" value={d.dueDate} onChange={set('dueDate')} /></Field>
              {milestones.length > 0 && <Field label="Milestone"><select value={d.milestone} onChange={set('milestone')}><option value="">None</option>{milestones.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}</select></Field>}
              <Field label="Estimate (hours)"><input type="number" min="0" max="1000" step="any" value={d.estimateHours} onChange={set('estimateHours')} /></Field>
              <Field label="Labels" hint="Separate with commas"><input type="text" value={d.labels} onChange={set('labels')} placeholder="api, urgent-fix" /></Field>
              <div className="field">
                <span className="label">Waits for</span>
                {others.length === 0 ? <span className="muted small">No other cards yet.</span> : (
                  <div className="pick-list" style={{ maxHeight: 150 }}>
                    {others.map((i) => (
                      <label key={i._id} className="pick-row" style={{ padding: '7px 10px' }}>
                        <input type="checkbox" checked={d.blockedBy.includes(i._id)} onChange={() => toggleBlocker(i._id)} />
                        <span className="grow small">{i.title}</span>
                        {i.status === 'done' && <span className="chip ok">Done</span>}
                      </label>
                    ))}
                  </div>
                )}
                <span className="hint">The card is flagged until these are done.</span>
              </div>
            </>
          ) : (
            <dl className="facts-list">
              <div><dt>Assigned to</dt><dd>{item.assignee?.name || 'Nobody'}</dd></div>
              <div><dt>Start</dt><dd>{item.startDate ? fmtDate(item.startDate, true) : '-'}</dd></div>
              <div><dt>Due</dt><dd>{item.dueDate ? fmtDate(item.dueDate, true) : '-'}</dd></div>
              <div><dt>Estimate</dt><dd>{item.estimateHours ? hoursText(item.estimateHours) : '-'}</dd></div>
              {(item.blockedBy || []).length > 0 && <div><dt>Waits for</dt><dd>{item.blockedBy.map((b) => b.title).join(', ')}</dd></div>}
            </dl>
          )}
          {!canManage && mine && <p className="muted small">You can tick the checklist, add links, log time and move this card. Ask the project lead to change the other details.</p>}
        </aside>
      </div>
    </Modal>
  );
}
