import { api } from '../../../lib/api.js';
import { useAsync } from '../../../lib/useAsync.js';
import { Empty, Loading } from '../../../components.jsx';

const dayLabel = (iso) => {
  const d = new Date(iso);
  const t = new Date();
  const same = (a, b) => a.toDateString() === b.toDateString();
  const y = new Date(t); y.setDate(t.getDate() - 1);
  return same(d, t) ? 'Today' : same(d, y) ? 'Yesterday' : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
};
const time = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

// Who did what in this project, newest first.
export default function Activity({ project }) {
  const state = useAsync(() => api.get(`/flow/projects/${project._id}/activity?limit=150`), [project._id]);
  const groups = [];
  for (const a of state.data?.items || []) {
    const label = dayLabel(a.at);
    if (!groups.length || groups[groups.length - 1].label !== label) groups.push({ label, list: [] });
    groups[groups.length - 1].list.push(a);
  }
  return (
    <div className="panel">
      <div className="panel-head"><h2>Activity</h2><button className="btn sm ghost" onClick={state.reload}>Refresh</button></div>
      <Loading state={state}>
        {state.data && (groups.length === 0 ? <Empty title="No activity yet">Moving cards, comments, documents and releases will show up here.</Empty> : groups.map((g) => (
          <div key={g.label}>
            <div className="muted small" style={{ padding: '10px 16px 4px', fontWeight: 600 }}>{g.label}</div>
            {g.list.map((a, n) => <div className="list-row" key={n}><div className="grow"><b>{a.userName}</b> {a.text}</div><span className="muted small">{time(a.at)}</span></div>)}
          </div>
        )))}
      </Loading>
    </div>
  );
}
