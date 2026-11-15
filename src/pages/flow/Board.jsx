import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useAsync } from '../../lib/useAsync.js';
import { useToast } from '../../lib/toast.jsx';
import { Loading, ProgressBar, Tabs } from '../../components.jsx';
import { fmtDate, rs } from '../../lib/format.js';
import { EMPTY_FILTERS, applyFilters, labelsOf } from '../../lib/flowView.js';
import { ProjectForm } from './Projects.jsx';
import { Avatar, PROJECT_STATUS, PROJECT_TONE, RagChip } from './shared.jsx';
import FilterBar from './project/FilterBar.jsx';
import TaskModal from './project/TaskModal.jsx';
import BoardView from './project/BoardView.jsx';
import ListView from './project/ListView.jsx';
import CalendarView from './project/CalendarView.jsx';
import TimelineView from './project/TimelineView.jsx';
import Overview from './project/Overview.jsx';
import Milestones from './project/Milestones.jsx';
import LinksShare from './project/LinksShare.jsx';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'board', label: 'Board' },
  { value: 'list', label: 'List' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'milestones', label: 'Milestones' },
  { value: 'links', label: 'Links' },
];
const FILTERED = ['board', 'list', 'calendar', 'timeline']; // tabs that show cards, so search and filters apply

export default function Board() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const { user } = useAuth();
  const admin = user.role === 'admin';
  const base = admin ? '/admin/flow' : '/flow';
  const nav = useNavigate();
  const toast = useToast();
  const state = useAsync(() => api.get(`/flow/projects/${id}`), [id]);
  const [card, setCard] = useState(null); // null | { id } to read/edit | { create: true, initial }
  const [editing, setEditing] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const d = state.data;
  const tab = TABS.some((t) => t.value === sp.get('tab')) ? sp.get('tab') : 'board';
  const setTab = (t) => { const n = new URLSearchParams(sp); n.set('tab', t); n.delete('item'); setSp(n, { replace: true }); };

  const team = useMemo(() => (d ? [...(d.project.lead ? [d.project.lead] : []), ...d.project.members.filter((m) => m._id !== d.project.lead?._id)] : []), [d]);
  const shown = useMemo(() => (d ? applyFilters(d.items, filters, user._id) : []), [d, filters, user._id]);
  const milestones = d?.project.milestones || [];

  // a card can be opened straight from a link (?item=...), for example from My work
  const linked = d && sp.get('item') ? d.items.find((i) => i._id === sp.get('item')) : null;
  const openId = card?.id || linked?._id || null;
  const current = d && openId ? d.items.find((i) => i._id === openId) : null;
  const closeCard = () => { setCard(null); if (sp.get('item')) { const n = new URLSearchParams(sp); n.delete('item'); setSp(n, { replace: true }); } };

  async function setStatus(status) {
    try { await api.patch(`/flow/projects/${id}`, { status }); state.reload(); } catch (e) { toast(e.message, 'bad'); }
  }
  async function removeProject() {
    if (!window.confirm(`Delete ${d.project.name} and all its cards? This cannot be undone.`)) return;
    try { await api.del(`/flow/projects/${id}`); nav(`${base}/projects`); } catch (e) { toast(e.message, 'bad'); }
  }

  return (
    <Loading state={state}>
      {d && (
        <>
          <div className="page-head">
            <div>
              <div className="muted small"><Link to={`${base}/projects`}>Projects</Link> / {d.project.code}</div>
              <h1>{d.project.name} <RagChip rag={d.health.rag} /></h1>
              <p className="sub">{d.project.client ? d.project.client.name : 'Internal project'}{d.project.lead ? ` · Lead ${d.project.lead.name}` : ''}{d.project.dueDate ? ` · Deadline ${fmtDate(d.project.dueDate, true)}` : ''}{admin && d.project.budget ? ` · Budget ${rs(d.project.budget)}` : ''}</p>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {admin ? <select value={d.project.status} onChange={(e) => setStatus(e.target.value)} aria-label="Project status">{Object.entries(PROJECT_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select> : <span className={`chip ${PROJECT_TONE[d.project.status]}`}>{PROJECT_STATUS[d.project.status]}</span>}
              {d.canManage && d.project.status !== 'completed' && <button className="btn primary" onClick={() => setCard({ create: true })}>Add card</button>}
              {admin && <button className="btn" onClick={() => setEditing(true)}>Edit project</button>}
            </div>
          </div>

          <div className="panel panel-pad stack" style={{ marginBottom: 16 }}>
            <div className="row small"><b className="grow">{d.project.progress.percent}% complete</b><span className="muted">{d.project.progress.done} of {d.project.progress.total} cards{d.project.progress.overdue ? `, ${d.project.progress.overdue} overdue` : ''}</span></div>
            <ProgressBar value={d.project.progress.percent} label="Project progress" />
            {d.project.description && <p className="prose small" style={{ margin: 0 }}>{d.project.description}</p>}
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}><span className="muted small">Team:</span>{d.project.members.length === 0 ? <span className="muted small">nobody yet</span> : d.project.members.map((m) => <span key={m._id} className="chip muted"><Avatar name={m.name} size={18} /> {m.name}</span>)}</div>
          </div>

          <Tabs tabs={TABS} value={tab} onChange={setTab} />
          <div style={{ marginTop: 14 }}>
            {FILTERED.includes(tab) && <FilterBar filters={filters} setFilters={setFilters} team={team} labels={labelsOf(d.items)} milestones={milestones} shown={shown.length} total={d.items.length} />}
            {tab === 'overview' && <Overview project={d.project} health={d.health} onOpen={(i) => setCard({ id: i })} goTab={setTab} />}
            {tab === 'board' && <BoardView items={shown} canManage={d.canManage} me={user._id} onOpen={(i) => setCard({ id: i })} reload={state.reload} />}
            {tab === 'list' && <ListView items={shown} milestones={milestones} onOpen={(i) => setCard({ id: i })} />}
            {tab === 'calendar' && <CalendarView items={shown} milestones={d.health.milestones} canManage={d.canManage && d.project.status !== 'completed'} onOpen={(i) => setCard({ id: i })} onCreate={(date) => setCard({ create: true, initial: { dueDate: date } })} />}
            {tab === 'timeline' && <TimelineView items={shown} milestones={d.health.milestones} project={d.project} onOpen={(i) => setCard({ id: i })} />}
            {tab === 'milestones' && <Milestones project={d.project} health={d.health} canManage={d.canManage} reload={state.reload} />}
            {tab === 'links' && <LinksShare project={d.project} canManage={d.canManage} admin={admin} reload={state.reload} />}
          </div>

          {admin && <p style={{ marginTop: 24 }}><button className="btn ghost sm" onClick={removeProject}>Delete this project</button></p>}
          {current && <TaskModal key={current._id} project={d.project} items={d.items} item={current} canManage={d.canManage} me={user._id} onClose={closeCard} onChanged={state.reload} />}
          {card?.create && <TaskModal project={d.project} items={d.items} item={null} initial={card.initial} canManage={d.canManage} me={user._id} onClose={closeCard} onChanged={state.reload} />}
          {editing && <ProjectForm project={d.project} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); state.reload(); }} />}
        </>
      )}
    </Loading>
  );
}
