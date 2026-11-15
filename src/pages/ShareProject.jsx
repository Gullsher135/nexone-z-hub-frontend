import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAsync } from '../lib/useAsync.js';
import { Loading, ProgressBar } from '../components.jsx';
import { ProductOf } from '../brand.jsx';
import { fmtDate } from '../lib/format.js';
import { COLUMNS, PROJECT_STATUS, PROJECT_TONE, STATUS_TONE } from './flow/shared.jsx';

const label = Object.fromEntries(COLUMNS.map((c) => [c.key, c.label]));

// What the client sees: progress only. Reached through a private link, no account needed.
export default function ShareProject() {
  const { token } = useParams();
  const state = useAsync(() => api.get(`/flow/share/${encodeURIComponent(token)}`), [token]);
  const d = state.data;
  return (
    <div className="share-wrap">
      <Loading state={state}>
        {d && (
          <div className="share-card stack">
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <img src="/nexonez-icon.png" alt="" width="34" height="34" />
              <div className="grow"><div className="muted small">Project progress</div><h1 style={{ margin: 0 }}>{d.project.name}</h1></div>
              <span className={`chip ${PROJECT_TONE[d.project.status]}`}>{PROJECT_STATUS[d.project.status]}</span>
            </div>
            <div className="muted">{d.project.client ? `For ${d.project.client}` : ''}{d.project.startDate ? `${d.project.client ? ' · ' : ''}Started ${fmtDate(d.project.startDate, true)}` : ''}{d.project.dueDate ? ` · Target ${fmtDate(d.project.dueDate, true)}` : ''}</div>

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
                    <span className={`chip ${m.complete ? 'ok' : m.overdue ? 'warn' : 'muted'}`}>{m.complete ? 'Done' : m.overdue ? 'Behind' : 'In progress'}</span>
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
            <p className="muted small">Last updated {new Date(d.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
            <ProductOf />
          </div>
        )}
      </Loading>
    </div>
  );
}
