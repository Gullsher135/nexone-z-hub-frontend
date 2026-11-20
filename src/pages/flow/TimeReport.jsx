import { useState } from 'react';
import { api, downloadFile } from '../../lib/api.js';
import { useAsync } from '../../lib/useAsync.js';
import { useToast } from '../../lib/toast.jsx';
import { Empty, Field, Loading } from '../../components.jsx';
import { KindChip } from './shared.jsx';
import { hoursText } from './shared.jsx';

const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function preset(name) {
  const t = new Date();
  if (name === 'week') { const s = new Date(t); s.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return { from: key(s), to: key(t) }; }
  if (name === 'last') return { from: key(new Date(t.getFullYear(), t.getMonth() - 1, 1)), to: key(new Date(t.getFullYear(), t.getMonth(), 0)) };
  return { from: key(new Date(t.getFullYear(), t.getMonth(), 1)), to: key(t) };
}

// Admin: hours logged by each person on each project in a date range, with a spreadsheet download.
export default function TimeReport() {
  const toast = useToast();
  const [range, setRange] = useState(preset('month'));
  const state = useAsync(() => api.get(`/flow/reports/time?from=${range.from}&to=${range.to}`), [range.from, range.to]);
  const d = state.data;
  return (
    <>
      <div className="page-head"><div><h1>Time report</h1><p className="sub">Hours logged on cards, by person and by project.</p></div>
        <button className="btn" onClick={() => downloadFile(`/flow/reports/time?from=${range.from}&to=${range.to}&format=csv`, `time-report-${range.from}-to-${range.to}.csv`).catch((e) => toast(e.message, 'bad'))}>Download CSV</button></div>
      <div className="panel panel-pad row" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
        <div className="seg">{[['month', 'This month'], ['week', 'This week'], ['last', 'Last month']].map(([k, l]) => <button key={k} type="button" onClick={() => setRange(preset(k))}>{l}</button>)}</div>
        <Field label="From"><input type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} /></Field>
        <Field label="To"><input type="date" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} /></Field>
      </div>
      <Loading state={state}>
        {d && (d.rows.length === 0 ? <div className="panel"><Empty title="No time logged">Nobody logged hours between these dates.</Empty></div> : (
          <div className="stack">
            <div className="panel kpis">
              <div className="kpi"><div className="v">{hoursText(d.total)}</div><div className="l">Total hours</div></div>
              <div className="kpi"><div className="v">{d.byUser.length}</div><div className="l">People</div></div>
              <div className="kpi"><div className="v">{d.byProject.length}</div><div className="l">Projects</div></div>
            </div>
            <div className="panel">
              <div className="panel-head"><h2>By person</h2></div>
              <div className="table-wrap"><table className="table"><thead><tr><th>Person</th><th>Project</th><th>Hours</th></tr></thead><tbody>
                {d.rows.map((r) => <tr key={`${r.user}${r.project}`}><td>{r.userName} <span className="muted small">{r.userCode}</span></td><td>{r.projectName} <span className="muted small">{r.projectCode}</span></td><td>{hoursText(r.hours)}</td></tr>)}
              </tbody></table></div>
            </div>
            <div className="panel">
              <div className="panel-head"><h2>By project</h2></div>
              {d.byProject.map((p) => <div className="list-row" key={p.id}><div className="grow"><b>{p.name}</b> <KindChip kind={p.kind} /></div><b>{hoursText(p.hours)}</b></div>)}
            </div>
          </div>
        ))}
      </Loading>
    </>
  );
}
