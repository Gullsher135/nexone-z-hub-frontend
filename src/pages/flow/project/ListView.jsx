import { useState } from 'react';
import { Empty } from '../../../components.jsx';
import { fmtDate } from '../../../lib/format.js';
import { checklistStats, isBlocked, sortItems } from '../../../lib/flowView.js';
import { Avatar, COLUMNS, PRIORITIES, PRIORITY_TONE, STATUS_TONE, TypeChip, hoursText, isLate } from '../shared.jsx';

const label = Object.fromEntries(COLUMNS.map((c) => [c.key, c.label]));

export default function ListView({ items, milestones, onOpen }) {
  const [sort, setSort] = useState({ key: 'due', dir: 'asc' });
  const rows = sortItems(items, sort.key, sort.dir);
  const mName = (id) => milestones.find((m) => m._id === id)?.name;
  const head = (key, text) => (
    <th aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="th-sort" onClick={() => setSort({ key, dir: sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc' })}>
        {text}{sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  );
  if (items.length === 0) return <div className="panel"><Empty title="No cards match">Change the filters, or add a card.</Empty></div>;
  return (
    <div className="panel table-wrap">
      <table className="table cards">
        <thead><tr>{head('title', 'Card')}{head('status', 'Status')}{head('priority', 'Priority')}{head('assignee', 'Assignee')}{head('due', 'Due')}<th>Milestone</th><th>Progress</th>{head('estimate', 'Time')}</tr></thead>
        <tbody>
          {rows.map((i) => {
            const cl = checklistStats(i);
            return (
              <tr key={i._id}>
                <td className="full">
                  <button type="button" className="link-btn" onClick={() => onOpen(i._id)}><b>{i.title}</b></button>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {i.type && i.type !== 'task' && <TypeChip type={i.type} />}
                    {isBlocked(i) && <span className="chip warn">Waiting</span>}
                    {(i.labels || []).map((l) => <span key={l} className="tag">{l}</span>)}
                  </div>
                </td>
                <td><span className={`chip ${STATUS_TONE[i.status]}`}>{label[i.status]}</span></td>
                <td><span className={`chip ${PRIORITY_TONE[i.priority]}`}>{PRIORITIES[i.priority]}</span></td>
                <td>{i.assignee ? <span className="row" style={{ gap: 6 }}><Avatar name={i.assignee.name} size={22} />{i.assignee.name}</span> : <span className="muted">-</span>}</td>
                <td className={isLate(i.dueDate, i.status) ? 'late-t nowrap' : 'nowrap'}>{i.dueDate ? fmtDate(i.dueDate) : <span className="muted">-</span>}</td>
                <td>{mName(i.milestone) || <span className="muted">-</span>}</td>
                <td>{cl.total ? `${cl.done}/${cl.total} steps` : <span className="muted">-</span>}</td>
                <td className="nowrap">{i.estimateHours ? `${hoursText(i.loggedHours)} / ${hoursText(i.estimateHours)}` : i.loggedHours ? hoursText(i.loggedHours) : <span className="muted">-</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
