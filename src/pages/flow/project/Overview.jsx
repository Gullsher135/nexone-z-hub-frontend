import { Link } from 'react-router-dom';
import { ProgressBar } from '../../../components.jsx';
import { fmtDate } from '../../../lib/format.js';
import { COLUMNS, RagChip, hoursText } from '../shared.jsx';

const Kpi = ({ v, l, tone }) => <div className="kpi"><div className="v" style={tone ? { color: `var(--${tone})` } : null}>{v}</div><div className="l">{l}</div></div>;

// Where the project stands: health, workload per person, milestones, what is due next.
export default function Overview({ project, health: h, onOpen, goTab }) {
  const people = new Map([...(project.lead ? [project.lead] : []), ...project.members].map((m) => [m._id, m]));
  const maxOpen = Math.max(1, ...h.workload.map((w) => w.open));
  const total = Math.max(1, h.total);
  return (
    <div className="stack">
      <div className={`panel panel-pad health health-${h.rag}`}>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <RagChip rag={h.rag} />
          <b className="grow">{h.rag === 'green' ? 'This project is on track.' : h.rag === 'done' ? 'This project is completed.' : h.rag === 'none' ? 'Add cards to start tracking progress.' : 'This project needs attention.'}</b>
        </div>
        {h.reasons.length > 0 && <ul className="health-reasons">{h.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
      </div>

      <div className="panel kpis kpis-6">
        <Kpi v={`${h.percent}%`} l={`Complete (${h.done} of ${h.total})`} />
        <Kpi v={h.overdue} l="Overdue" tone={h.overdue ? 'bad' : null} />
        <Kpi v={h.dueSoon} l="Due in 7 days" />
        <Kpi v={h.blocked} l="Waiting on others" tone={h.blocked ? 'warn' : null} />
        <Kpi v={h.unassigned} l="Unassigned" />
        <Kpi v={h.hours.estimate ? `${hoursText(h.hours.logged)}` : '-'} l={h.hours.estimate ? `of ${hoursText(h.hours.estimate)} estimated` : 'Time logged'} />
      </div>

      <div className="two-col">
        <div className="panel panel-pad stack">
          <h3 style={{ margin: 0 }}>Cards by status</h3>
          <div className="stackbar" role="img" aria-label="Cards by status">
            {COLUMNS.map((c) => h.byStatus[c.key] > 0 && <span key={c.key} className={`sb sb-${c.key}`} style={{ width: `${(h.byStatus[c.key] / total) * 100}%` }} title={`${c.label}: ${h.byStatus[c.key]}`} />)}
          </div>
          <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>{COLUMNS.map((c) => <span key={c.key} className="small"><i className={`sb-dot sb-${c.key}`} /> {c.label} <b>{h.byStatus[c.key]}</b></span>)}</div>
          {h.hours.estimate > 0 && <div><div className="row small"><span className="grow muted">Time used</span><span>{hoursText(h.hours.logged)} of {hoursText(h.hours.estimate)}</span></div><ProgressBar value={Math.min(100, Math.round((h.hours.logged / h.hours.estimate) * 100))} label="Time used" /><div className="muted small" style={{ marginTop: 4 }}>About {hoursText(h.hours.remaining)} of estimated work is left on open cards.</div></div>}
        </div>

        <div className="panel panel-pad stack">
          <h3 style={{ margin: 0 }}>Coming up</h3>
          {h.upcoming.length === 0 ? <div className="muted small">No open cards have a due date.</div> : h.upcoming.map((u) => (
            <div className="row" key={u._id}><button type="button" className="link-btn grow" onClick={() => onOpen(u._id)}>{u.title}</button><span className={`small ${u.overdue ? 'late-t' : 'muted'}`}>{fmtDate(u.dueDate)}</span></div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Workload</h2><span className="muted small">Open cards per person</span></div>
        {h.workload.length === 0 ? <div className="panel-pad muted small">Nothing to show yet.</div> : (
          <table className="table cards">
            <thead><tr><th>Person</th><th>Open</th><th>In progress</th><th>Overdue</th><th>Hours left</th><th>Logged</th></tr></thead>
            <tbody>
              {h.workload.map((w) => (
                <tr key={w.user || 'none'}>
                  <td className="full"><b>{w.user ? people.get(w.user)?.name || 'Former member' : 'Unassigned'}</b></td>
                  <td style={{ minWidth: 140 }}><div className="row" style={{ gap: 8 }}><span className="num" style={{ width: 20 }}>{w.open}</span><div className="grow"><ProgressBar value={Math.round((w.open / maxOpen) * 100)} label="Open cards" /></div></div></td>
                  <td>{w.doing}</td>
                  <td className={w.overdue ? 'late-t' : ''}>{w.overdue}</td>
                  <td>{w.remainingHours ? hoursText(w.remainingHours) : '-'}</td>
                  <td>{w.loggedHours ? hoursText(w.loggedHours) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <div className="panel-head"><h2>Milestones</h2><button type="button" className="btn sm" onClick={() => goTab('milestones')}>Manage</button></div>
        {h.milestones.length === 0 ? <div className="panel-pad muted small">No milestones yet. Break the project into phases in the Milestones tab.</div> : h.milestones.map((m) => (
          <div className="list-row" key={m._id}>
            <div className="grow"><b>{m.name}</b><div className="muted small">{m.dueDate ? `Due ${fmtDate(m.dueDate, true)}` : 'No date'} · {m.done} of {m.total} cards done</div></div>
            <div style={{ width: 120 }}><ProgressBar value={m.percent} label={`${m.name} progress`} /></div>
            <span className={`chip ${m.complete ? 'ok' : m.overdue ? 'bad' : 'muted'}`}>{m.complete ? 'Done' : m.overdue ? 'Late' : 'Open'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
