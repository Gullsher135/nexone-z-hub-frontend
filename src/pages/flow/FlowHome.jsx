import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAsync } from '../../lib/useAsync.js';
import { Empty, Loading, ProgressBar } from '../../components.jsx';
import { fmtDate } from '../../lib/format.js';
import { KINDS, KIND_ORDER, KindChip, PROJECT_STATUS, PROJECT_TONE, RagChip } from './shared.jsx';
import { ProjectForm } from './Projects.jsx';
import FlowSearch from './FlowSearch.jsx';

export default function FlowHome() {
  const nav = useNavigate();
  const [creating, setCreating] = useState(false);
  const ov = useAsync(() => api.get('/flow/overview'), []);
  const pr = useAsync(() => api.get('/flow/projects?status=active'), []);
  const o = ov.data;
  return (
    <>
      <div className="page-head"><div><h1>NexoneZ Flow</h1><p className="sub">Projects, products and SaaS: task boards, releases, documents and delivery.</p></div><button className="btn primary" onClick={() => setCreating(true)}>New</button></div>
      <div style={{ marginBottom: 16 }}><FlowSearch base="/admin/flow" /></div>
      <Loading state={ov}>
        {o && (
          <>
            <div className="panel kpis" style={{ marginBottom: 20 }}>
              <div className="kpi"><div className="v">{o.byStatus.active}</div><div className="l">Active now</div></div>
              <div className="kpi"><div className="v">{o.openCards}</div><div className="l">Open cards</div></div>
              <div className="kpi"><div className="v" style={o.overdueCards ? { color: 'var(--bad)' } : null}>{o.overdueCards}</div><div className="l">Overdue cards</div></div>
              <div className="kpi"><div className="v">{o.clients}</div><div className="l">Clients</div></div>
            </div>
            <div className="kind-picks" style={{ marginBottom: 20 }}>
              {KIND_ORDER.map((k) => (
                <Link key={k} to={`/admin/flow/${KINDS[k].path}`} className="panel panel-pad stack" style={{ color: 'inherit', textDecoration: 'none', gap: 4 }}>
                  <div className="row"><b className="grow">{KINDS[k].plural}</b><KindChip kind={k} /></div>
                  <div className="kpi" style={{ padding: 0, textAlign: 'left' }}><div className="v">{o.byKind?.[k] ?? 0}</div></div>
                  <div className="muted small">{KINDS[k].short}</div>
                </Link>
              ))}
            </div>
            {o.attention.length > 0 && (
              <div className="panel" style={{ marginBottom: 20 }}>
                <div className="panel-head"><h2>Needs attention</h2><span className="muted small">{o.health.red} late, {o.health.amber} at risk, {o.health.green} on track</span></div>
                {o.attention.map((a) => (
                  <Link key={a._id} to={`/admin/flow/projects/${a._id}?tab=overview`} className="list-row linkrow">
                    <div className="grow"><b>{a.name}</b> <KindChip kind={a.kind} /><div className="muted small">{a.reasons.join(' · ')}</div></div>
                    <span className="muted small">{a.percent}%</span>
                    <RagChip rag={a.rag} />
                  </Link>
                ))}
              </div>
            )}
            {o.lateProjects.length > 0 && <div className="alert warn" style={{ marginBottom: 16 }}><b>Past deadline:</b> {o.lateProjects.map((p) => <span key={p._id}><Link to={`/admin/flow/projects/${p._id}`}>{p.name}</Link> (due {fmtDate(p.dueDate, true)}) </span>)}</div>}
          </>
        )}
      </Loading>
      <div className="panel">
        <div className="panel-head"><h2>Active now</h2><Link to="/admin/flow/projects" className="small">All projects</Link></div>
        <Loading state={pr}>
          {pr.data && (pr.data.items.length === 0 ? <Empty title="Nothing active">Create a project, product or SaaS and set its status to Active.</Empty> : pr.data.items.map((p) => (
            <Link key={p._id} to={`/admin/flow/projects/${p._id}`} className="list-row linkrow">
              <div className="grow"><b>{p.name}</b> <KindChip kind={p.kind} /><div className="muted small">{p.code}{p.client ? ` · ${p.client.name}` : ''}{p.dueDate ? ` · due ${fmtDate(p.dueDate, true)}` : ''}</div></div>
              {p.health && p.health.rag !== 'none' && <RagChip rag={p.health.rag} />}
              <div style={{ width: 120 }}><ProgressBar value={p.progress.percent} label={`${p.name} progress`} /><div className="muted small">{p.progress.done}/{p.progress.total} done</div></div>
              <span className={`chip ${PROJECT_TONE[p.status]}`}>{PROJECT_STATUS[p.status]}</span>
            </Link>
          )))}
        </Loading>
      </div>
      {creating && <ProjectForm onClose={() => setCreating(false)} onSaved={(p) => { setCreating(false); nav(`/admin/flow/${KINDS[p.kind || 'project'].path}/${p._id}`); }} />}
    </>
  );
}
