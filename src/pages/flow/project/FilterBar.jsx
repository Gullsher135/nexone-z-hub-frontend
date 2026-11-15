import { EMPTY_FILTERS, hasFilters } from '../../../lib/flowView.js';
import { PRIORITIES, TYPES } from '../shared.jsx';

// Search and filters shared by the Board, List, Calendar and Timeline views.
export default function FilterBar({ filters, setFilters, team, labels, milestones, shown, total }) {
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <div className="filterbar">
      <input type="search" placeholder="Search cards" value={filters.q} onChange={set('q')} aria-label="Search cards" />
      <select value={filters.assignee} onChange={set('assignee')} aria-label="Assignee">
        <option value="">Everyone</option>
        <option value="me">Assigned to me</option>
        <option value="none">Unassigned</option>
        {team.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
      </select>
      <select value={filters.priority} onChange={set('priority')} aria-label="Priority">
        <option value="">Any priority</option>
        {Object.entries(PRIORITIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <select value={filters.type} onChange={set('type')} aria-label="Type">
        <option value="">Any type</option>
        {Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {labels.length > 0 && (
        <select value={filters.label} onChange={set('label')} aria-label="Label">
          <option value="">Any label</option>
          {labels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      )}
      {milestones.length > 0 && (
        <select value={filters.milestone} onChange={set('milestone')} aria-label="Milestone">
          <option value="">Any milestone</option>
          <option value="none">No milestone</option>
          {milestones.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
        </select>
      )}
      <label className="check small"><input type="checkbox" checked={filters.hideDone} onChange={set('hideDone')} /> Hide done</label>
      <label className="check small"><input type="checkbox" checked={filters.overdueOnly} onChange={set('overdueOnly')} /> Overdue only</label>
      {hasFilters(filters) && (
        <>
          <button type="button" className="btn sm ghost" onClick={() => setFilters(EMPTY_FILTERS)}>Clear</button>
          <span className="muted small">Showing {shown} of {total}</span>
        </>
      )}
    </div>
  );
}
