import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useAsync } from '../../lib/useAsync.js';
import { useToast } from '../../lib/toast.jsx';
import { Empty, Field, Loading, Modal, ProgressBar } from '../../components.jsx';
import { fmtDate, rs } from '../../lib/format.js';
import FlowSearch from './FlowSearch.jsx';
import { KINDS, KIND_ORDER, KindChip, PROJECT_STATUS, PROJECT_TONE, RagChip, STAGES, STAGE_TONE } from './shared.jsx';

// Step 1 of creating: explains the three kinds in plain words so the right one is picked.
function KindChooser({ onPick, onClose }) {
  return (
    <Modal wide title="What are you starting?" onClose={onClose} footer={<button className="btn" onClick={onClose}>Cancel</button>}>
      <div className="stack">
        <div className="kind-picks">
          {KIND_ORDER.map((k) => (
            <button type="button" key={k} className="kind-pick" onClick={() => onPick(k)}>
              <div className="row"><h3 className="grow">{KINDS[k].label}</h3><KindChip kind={k} /></div>
              <p>{KINDS[k].defines}</p>
              <p className="eg">For example: {KINDS[k].example}</p>
            </button>
          ))}
        </div>
        <div className="kind-help">
          <b>Not sure? Ask yourself:</b><br />
          Is it built for one client, once? It is a <b>Project</b>.<br />
          Do we build it once and sell the same package to many customers? It is a <b>Product</b>.<br />
          Do we host it online and customers pay us again and again? It is <b>SaaS</b>.
        </div>
      </div>
    </Modal>
  );
}

// Create or edit a project, product or SaaS (admin only).
export function ProjectForm({ project, kind: startKind, onClose, onSaved }) {
  const toast = useToast();
  const clients = useAsync(() => api.get('/flow/clients'), []);
  const team = useAsync(() => api.get('/crew/team'), []);
  const staff = (team.data?.items || []).filter((u) => ['admin', 'employee', 'intern'].includes(u.role));
  const [kind, setKind] = useState(project?.kind || startKind || null);
  const [f, setF] = useState({
    name: project?.name || '', description: project?.description || '', client: project?.client?._id || '', status: project?.status || 'planning',
    startDate: project?.startDate || '', dueDate: project?.dueDate || '', budget: project?.budget || '', lead: project?.lead?._id || '',
    members: (project?.members || []).map((m) => m._id),
    stage: project?.stage || 'idea', version: project?.version || '', customers: project?.metrics?.customers ?? '', mrr: project?.metrics?.mrr ?? '',
    starter: !project,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (id) => setF({ ...f, members: f.members.includes(id) ? f.members.filter((x) => x !== id) : [...f.members, id] });

  if (!kind) return <KindChooser onPick={setKind} onClose={onClose} />;
  const K = KINDS[kind];
  const isProject = kind === 'project';

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const body = {
        name: f.name, description: f.description, status: f.status, startDate: f.startDate, dueDate: f.dueDate, members: f.members, kind,
        budget: Number(f.budget) || 0, client: isProject ? f.client || null : null, lead: f.lead || null, starterMilestones: !project && f.starter,
        ...(isProject ? {} : { stage: f.stage, version: f.version, metrics: { customers: f.customers, mrr: f.mrr } }),
      };
      const r = project ? await api.patch(`/flow/projects/${project._id}`, body) : await api.post('/flow/projects', body);
      toast(`${K.label} saved`);
      onSaved(r.project);
    } catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal wide title={project ? `Edit ${K.label.toLowerCase()}` : `New ${K.label.toLowerCase()}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" form="pj-form" disabled={busy}>{busy ? 'Saving...' : `Save ${K.label.toLowerCase()}`}</button></>}>
      <form id="pj-form" className="stack" onSubmit={save}>
        {error && <div className="alert bad" role="alert">{error}</div>}
        <div className="kind-def">
          <div className="row"><b className="grow">{K.label}</b>{!project && <button type="button" className="link-btn small" onClick={() => setKind(null)}>Change type</button>}</div>
          {K.defines} <span className="muted">For example: {K.example}</span>
        </div>
        {project && <Field label="Type" hint="Change this only if it was created as the wrong type."><select value={kind} onChange={(e) => setKind(e.target.value)}>{KIND_ORDER.map((k) => <option key={k} value={k}>{KINDS[k].label}</option>)}</select></Field>}
        <Field label={`${K.label} name`}><input type="text" value={f.name} onChange={set('name')} required autoFocus /></Field>
        <Field label="Description"><textarea rows="3" value={f.description} onChange={set('description')} /></Field>
        <div className="grid2">
          {isProject && <Field label="Client"><select value={f.client} onChange={set('client')}><option value="">No client (internal)</option>{(clients.data?.items || []).map((c) => <option key={c._id} value={c._id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}</select></Field>}
          <Field label="Status"><select value={f.status} onChange={set('status')}>{Object.entries(PROJECT_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          {!isProject && <Field label="Stage" hint="Where it is in its life."><select value={f.stage} onChange={set('stage')}>{Object.entries(STAGES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>}
          {!isProject && <Field label="Current version" hint="For example 1.0.0. Updates itself when you add a release."><input type="text" value={f.version} onChange={set('version')} maxLength={20} /></Field>}
          <Field label="Start date"><input type="date" value={f.startDate} onChange={set('startDate')} /></Field>
          <Field label={K.due}><input type="date" value={f.dueDate} onChange={set('dueDate')} /></Field>
          <Field label={K.budget} hint="Only you can see this."><input type="number" min="0" value={f.budget} onChange={set('budget')} /></Field>
          <Field label={`${K.label} lead`} hint="The lead can add and edit cards."><select value={f.lead} onChange={set('lead')}><option value="">No lead</option>{staff.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</select></Field>
          {!isProject && <Field label={kind === 'saas' ? 'Customers (subscribers)' : 'Customers (licences sold)'}><input type="number" min="0" value={f.customers} onChange={set('customers')} /></Field>}
          {!isProject && <Field label={kind === 'saas' ? 'Monthly revenue (Rs)' : 'Revenue so far (Rs)'} hint="Only you can see this."><input type="number" min="0" value={f.mrr} onChange={set('mrr')} /></Field>}
        </div>
        {!project && <label className="check"><input type="checkbox" checked={f.starter} onChange={(e) => setF({ ...f, starter: e.target.checked })} />Add a ready-made set of phases (milestones) for a {K.label.toLowerCase()}. You can change them later.</label>}
        <div><b>Team</b> <span className="muted small">(who can see this and take cards)</span></div>
        <div className="checks">{staff.map((u) => <label key={u._id} className="check"><input type="checkbox" checked={f.members.includes(u._id)} onChange={() => toggle(u._id)} />{u.name}<span className="muted small"> {u.designation || u.role}</span></label>)}</div>
      </form>
    </Modal>
  );
}

// The list page for one kind: projects, products or SaaS.
export default function Projects({ kind = 'project' }) {
  const { user } = useAuth();
  const admin = user.role === 'admin';
  const base = admin ? '/admin/flow' : '/flow';
  const K = KINDS[kind];
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(admin && sp.get('new') === '1');
  const state = useAsync(() => api.get(`/flow/projects?kind=${kind}${status ? `&status=${status}` : ''}`), [status, kind]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = state.data?.items || [];
    return t ? list.filter((p) => `${p.name} ${p.code} ${p.client?.name || ''}`.toLowerCase().includes(t)) : list;
  }, [state.data, q]);
  return (
    <>
      <div className="page-head"><div><h1>{K.plural}</h1><p className="sub">{K.short} {admin ? '' : `Only the ${K.plural.toLowerCase()} you are part of are shown.`}</p></div>{admin && <button className="btn primary" onClick={() => setCreating(true)}>New {K.label.toLowerCase()}</button>}</div>
      <div style={{ marginBottom: 12 }}><FlowSearch base={base} /></div>
      <div className="tools" style={{ marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
        <input type="search" placeholder={`Search ${K.plural.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" style={{ maxWidth: 260 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter"><option value="">Every status</option>{Object.entries(PROJECT_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </div>
      <Loading state={state}>
        {state.data && (shown.length === 0 ? (
          <div className="panel"><Empty title={q || status ? 'Nothing matches' : `No ${K.plural.toLowerCase()} yet`}>{q || status ? 'Try a different search or status.' : <><div style={{ maxWidth: 520, margin: '0 auto' }}>{K.defines}</div>{admin ? <p>Press New {K.label.toLowerCase()} to create one.</p> : <p>You have not been added to one yet.</p>}</>}</Empty></div>
        ) : (
          <div className="proj-grid">
            {shown.map((p) => (
              <Link key={p._id} to={`${base}/${K.path}/${p._id}`} className="panel proj-card">
                <div className="row" style={{ gap: 6 }}><span className="muted small grow">{p.code}</span>{p.health && p.status !== 'completed' && p.health.rag !== 'none' && <RagChip rag={p.health.rag} />}<span className={`chip ${PROJECT_TONE[p.status]}`}>{PROJECT_STATUS[p.status]}</span></div>
                <h3>{p.name}</h3>
                <div className="muted small">
                  {kind === 'project' ? (p.client ? p.client.name : 'Internal project') : <>{p.stage && <span className={`chip ${STAGE_TONE[p.stage]}`}>{STAGES[p.stage]}</span>} {p.version ? `v${p.version}` : 'No version yet'}{p.metrics?.customers ? ` · ${p.metrics.customers} customers` : ''}</>}
                  {p.lead ? ` · Lead ${p.lead.name}` : ''}
                </div>
                <ProgressBar value={p.progress.percent} label={`${p.name} progress`} />
                <div className="row small"><span className="muted grow">{p.progress.done} of {p.progress.total} cards done</span>{p.progress.overdue > 0 && <span className="chip bad">{p.progress.overdue} overdue</span>}</div>
                <div className="muted small">{p.dueDate ? `${kind === 'project' ? 'Deadline' : 'Target'} ${fmtDate(p.dueDate, true)}` : 'No date set'}{admin && p.budget ? ` · ${rs(p.budget)}` : ''}</div>
              </Link>
            ))}
          </div>
        ))}
      </Loading>
      {creating && <ProjectForm kind={kind} onClose={() => setCreating(false)} onSaved={(p) => { setCreating(false); nav(`${base}/${KINDS[p.kind || 'project'].path}/${p._id}`); }} />}
    </>
  );
}
