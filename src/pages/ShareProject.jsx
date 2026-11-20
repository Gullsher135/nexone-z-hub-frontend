import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAsync } from '../lib/useAsync.js';
import { Field, Loading, ProgressBar } from '../components.jsx';
import { ProductOf } from '../brand.jsx';
import { fmtDate } from '../lib/format.js';
import { COLUMNS, KINDS, PROJECT_STATUS, PROJECT_TONE, RELEASE_TONE, RELEASE_TYPES, STAGES, STATUS_TONE } from './flow/shared.jsx';

const label = Object.fromEntries(COLUMNS.map((c) => [c.key, c.label]));

// What the client sees: progress only. Reached through a private link, no account needed.
export default function ShareProject() {
  const { token } = useParams();
  const state = useAsync(() => api.get(`/flow/share/${encodeURIComponent(token)}`), [token]);
  const d = state.data;
  const [name, setName] = useState(() => localStorage.getItem('nz_client_name') || '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState({ text: '', bad: false });
  async function send(body, done) {
    const who = (body.name || name).trim() || (window.prompt('Please write your name') || '').trim();
    if (!who) return setNote({ text: 'Please write your name first.', bad: true });
    setName(who); localStorage.setItem('nz_client_name', who);
    setBusy(true); setNote({ text: '', bad: false });
    try { await api.post(`/flow/share/${encodeURIComponent(token)}/feedback`, { ...body, name: who }); setNote({ text: done, bad: false }); if (!body.approve) setMessage(''); state.reload(); } catch (e) { setNote({ text: e.message, bad: true }); } finally { setBusy(false); }
  }
  return (
    <div className="share-wrap">
      <Loading state={state}>
        {d && (
          <div className="share-card stack">
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <img src="/nexonez-icon.png" alt="" width="34" height="34" />
              <div className="grow"><div className="muted small">{(KINDS[d.project.kind] || KINDS.project).label} progress</div><h1 style={{ margin: 0 }}>{d.project.name}</h1></div>
              <span className={`chip ${PROJECT_TONE[d.project.status]}`}>{PROJECT_STATUS[d.project.status]}</span>
            </div>
            <div className="muted">{d.project.kind !== 'project' && d.project.stage ? `${STAGES[d.project.stage]}${d.project.version ? ` · v${d.project.version}` : ''}` : ''}{d.project.client ? `For ${d.project.client}` : ''}{d.project.startDate ? `${d.project.client ? ' · ' : ''}Started ${fmtDate(d.project.startDate, true)}` : ''}{d.project.dueDate ? ` · Target ${fmtDate(d.project.dueDate, true)}` : ''}</div>

            <div className="panel panel-pad stack">
              <div className="row"><b className="grow" style={{ fontSize: 28 }}>{d.progress.percent}% complete</b><span className="muted small">{d.progress.done} of {d.progress.total} tasks done</span></div>
              <ProgressBar value={d.progress.percent} label="Overall progress" />
              <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>{COLUMNS.map((c) => <span key={c.key} className="small"><i className={`sb-dot sb-${c.key}`} /> {c.label} <b>{d.progress.byStatus[c.key]}</b></span>)}</div>
            </div>

            {d.milestones.length > 0 && (
              <div className="panel">
                <div className="panel-head"><h2>Milestones</h2></div>
                {d.milestones.map((m) => (
                  <div className="list-row" key={m.name + m.dueDate} style={{ flexWrap: 'wrap' }}>
                    <div className="grow" style={{ minWidth: 180 }}><b>{m.name}</b><div className="muted small">{m.dueDate ? `Planned for ${fmtDate(m.dueDate, true)}` : 'No date set'}</div></div>
                    <div style={{ width: 130 }}><ProgressBar value={m.percent} label={`${m.name} progress`} /></div>
                    {m.approvedBy ? <span className="chip ok" title={m.approvedAt ? fmtDate(m.approvedAt.slice(0, 10), true) : ''}>Approved by {m.approvedBy}</span> : <>
                      <span className={`chip ${m.complete ? 'ok' : m.overdue ? 'warn' : 'muted'}`}>{m.complete ? 'Done' : m.overdue ? 'Behind' : 'In progress'}</span>
                      {m.complete && d.allowFeedback && <button className="btn sm" disabled={busy} onClick={() => window.confirm(`Approve \"${m.name}\"?`) && send({ milestoneId: m.id, approve: true }, `Thank you. You approved ${m.name}.`)}>Approve</button>}
                    </>}
                  </div>
                ))}
              </div>
            )}

            {d.releases && d.releases.length > 0 && (
              <div className="panel">
                <div className="panel-head"><h2>What is new</h2></div>
                {d.releases.map((r) => (
                  <div className="list-row" key={r.version} style={{ alignItems: 'flex-start' }}>
                    <div className="grow"><div className="row" style={{ gap: 8, flexWrap: 'wrap' }}><b>v{r.version}</b><span className={`chip ${RELEASE_TONE[r.type]}`}>{RELEASE_TYPES[r.type]}</span>{r.title && <span>{r.title}</span>}<span className="muted small">{r.date ? fmtDate(r.date, true) : ''}</span></div>{r.notes && <div className="small" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{r.notes}</div>}</div>
                  </div>
                ))}
              </div>
            )}

            {d.tasks && (
              <div className="panel">
                <div className="panel-head"><h2>Tasks</h2></div>
                {d.tasks.length === 0 ? <div className="panel-pad muted">No tasks yet.</div> : d.tasks.map((t, n) => (
                  <div className="list-row" key={n}>
                    <div className="grow"><b>{t.title}</b>{(t.milestone || t.dueDate) && <div className="muted small">{t.milestone || ''}{t.milestone && t.dueDate ? ' · ' : ''}{t.dueDate ? `due ${fmtDate(t.dueDate)}` : ''}</div>}</div>
                    <span className={`chip ${STATUS_TONE[t.status]}`}>{label[t.status]}</span>
                  </div>
                ))}
              </div>
            )}
            {d.allowFeedback && (
              <form className="panel panel-pad stack" onSubmit={(e) => { e.preventDefault(); send({ message }, 'Thank you. Your message was sent to the team.'); }}>
                <div><h2 style={{ margin: 0 }}>Send a message to the team</h2><p className="muted small" style={{ margin: '4px 0 0' }}>Questions, changes or feedback. The team is notified straight away.</p></div>
                <Field label="Your name"><input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" /></Field>
                <Field label="Message"><textarea rows="3" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} /></Field>
                {note.text && <div className={`alert ${note.bad ? 'bad' : 'ok'}`} role={note.bad ? 'alert' : 'status'}>{note.text}</div>}
                <div><button className="btn primary" disabled={busy || !message.trim()}>{busy ? 'Sending...' : 'Send message'}</button></div>
              </form>
            )}
            <p className="muted small">Last updated {new Date(d.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
            <ProductOf />
          </div>
        )}
      </Loading>
    </div>
  );
}
