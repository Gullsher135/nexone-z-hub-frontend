import { Link } from 'react-router-dom';
import FlowSearch from './FlowSearch.jsx';
import { api } from '../../lib/api.js';
import { useAsync } from '../../lib/useAsync.js';
import { useToast } from '../../lib/toast.jsx';
import { Empty, Loading } from '../../components.jsx';
import { fmtDate } from '../../lib/format.js';
import { addDays, localToday } from '../../lib/flowView.js';
import { COLUMNS, NEXT, NEXT_LABEL, PRIORITIES, PRIORITY_TONE, TypeChip } from './shared.jsx';

const Stat = ({ v, l, tone }) => <div className="kpi"><div className="v" style={v && tone ? { color: `var(--${tone})` } : null}>{v}</div><div className="l">{l}</div></div>;

// Cards assigned to me, grouped by how soon they are due.
export default function MyWork() {
  const toast = useToast();
  const state = useAsync(() => api.get('/flow/my-work'), []);
  async function quick(i) {
    try { await api.post(`/flow/items/${i._id}/status`, { status: NEXT[i.status] }); state.reload(); } catch (e) { toast(e.message, 'bad'); }
  }
  const label = Object.fromEntries(COLUMNS.map((c) => [c.key, c.label]));
  const today = localToday();
  const week = addDays(today, 7);
  const items = state.data?.items || [];
  const groups = [
    { key: 'overdue', title: 'Overdue', tone: 'bad', list: items.filter((i) => i.dueDate && i.dueDate < today) },
    { key: 'today', title: 'Due today', tone: 'warn', list: items.filter((i) => i.dueDate === today) },
    { key: 'week', title: 'Due in the next 7 days', list: items.filter((i) => i.dueDate > today && i.dueDate <= week) },
    { key: 'later', title: 'Later', list: items.filter((i) => i.dueDate > week) },
    { key: 'none', title: 'No due date', list: items.filter((i) => !i.dueDate) },
  ].filter((g) => g.list.length > 0);
  const sm = state.data?.summary;

  return (
    <>
      <div style={{ marginBottom: 12 }}><FlowSearch base="/flow" /></div>
      <div className="page-head"><div><h1>My work</h1><p className="sub">Cards assigned to you across all projects.</p></div></div>
      <Loading state={state}>
        {state.data && (
          <>
            <div className="panel kpis" style={{ marginBottom: 20 }}>
              <Stat v={sm.overdue} l="Overdue" tone="bad" />
              <Stat v={sm.dueToday} l="Due today" tone="warn" />
              <Stat v={sm.dueSoon} l="Due in 7 days" />
              <Stat v={sm.blocked} l="Waiting on others" />
            </div>
            <div className="dash-grid">
              <div>
                {items.length === 0 ? <div className="panel"><Empty title="Nothing assigned">New cards from your projects will show up here.</Empty></div> : groups.map((g) => (
                  <div className="panel" key={g.key} style={{ marginBottom: 16 }}>
                    <div className="panel-head"><h2 style={g.tone ? { color: `var(--${g.tone})` } : null}>{g.title} ({g.list.length})</h2></div>
                    {g.list.map((i) => (
                      <div className="list-row" key={i._id} style={{ flexWrap: 'wrap' }}>
                        <div className="grow" style={{ minWidth: 200 }}>
                          <Link to={`/flow/projects/${i.project._id}?item=${i._id}`}><b>{i.title}</b></Link>
                          <div className="muted small">{i.project.name} · {label[i.status]}{i.dueDate ? ` · due ${fmtDate(i.dueDate, true)}` : ''}</div>
                        </div>
                        {i.type && i.type !== 'task' && <TypeChip type={i.type} />}
                        {i.blocked && <span className="chip warn">Waiting</span>}
                        <span className={`chip ${PRIORITY_TONE[i.priority]}`}>{PRIORITIES[i.priority]}</span>
                        {NEXT[i.status] && <button className="btn sm primary" onClick={() => quick(i)}>{NEXT_LABEL[i.status]}</button>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="panel"><div className="panel-head"><h2>My projects</h2><Link to="/flow/projects" className="small">All</Link></div>
                {state.data.projects.length === 0 ? <div className="panel-pad muted">You are not on a project yet.</div> : state.data.projects.map((p) => (
                  <Link key={p._id} to={`/flow/projects/${p._id}`} className="list-row linkrow"><div className="grow"><b>{p.name}</b><div className="muted small">{p.code}{p.dueDate ? ` · due ${fmtDate(p.dueDate, true)}` : ''}</div></div></Link>
                ))}
              </div>
            </div>
          </>
        )}
      </Loading>
    </>
  );
}
