import { useToast } from '../../../lib/toast.jsx';
import { api } from '../../../lib/api.js';
import { fmtDate } from '../../../lib/format.js';
import { checklistStats, isBlocked } from '../../../lib/flowView.js';
import { Avatar, COLUMNS, NEXT, NEXT_LABEL, TypeChip, hoursText, isLate } from '../shared.jsx';

export default function BoardView({ items, canManage, me, onOpen, reload }) {
  const toast = useToast();
  async function quick(item) {
    try { await api.post(`/flow/items/${item._id}/status`, { status: NEXT[item.status] }); reload(); } catch (e) { toast(e.message, 'bad'); }
  }
  return (
    <div className="board">
      {COLUMNS.map((col) => {
        const cards = items.filter((i) => i.status === col.key);
        return (
          <section key={col.key} className={`col col-${col.key}`} aria-label={col.label}>
            <h3>{col.label} <span className="count">{cards.length}</span></h3>
            {cards.length === 0 && <div className="col-empty muted small">Nothing here</div>}
            {cards.map((i) => {
              const mine = i.assignee?._id === me;
              const canMove = (canManage || mine) && NEXT[i.status];
              const cl = checklistStats(i);
              const labels = i.labels || [];
              return (
                <div key={i._id} className={`kcard ${isLate(i.dueDate, i.status) ? 'late' : ''}`}>
                  <button type="button" className="kcard-main" onClick={() => onOpen(i._id)}>
                    <span className={`dot ${i.priority}`} aria-label={`${i.priority} priority`} />
                    <b>{i.title}</b>
                  </button>
                  {((i.type && i.type !== 'task') || labels.length > 0 || isBlocked(i)) && (
                    <div className="kcard-tags">
                      {i.type && i.type !== 'task' && <TypeChip type={i.type} />}
                      {isBlocked(i) && <span className="chip warn">Waiting</span>}
                      {labels.slice(0, 3).map((l) => <span key={l} className="tag">{l}</span>)}
                      {labels.length > 3 && <span className="muted small">+{labels.length - 3}</span>}
                    </div>
                  )}
                  <div className="kcard-meta">
                    {i.assignee ? <Avatar name={i.assignee.name} /> : <span className="muted small">Unassigned</span>}
                    <span className="grow" />
                    {cl.total > 0 && <span className="muted small" title="Checklist">{cl.done}/{cl.total}</span>}
                    {i.estimateHours > 0 && <span className="muted small" title="Logged of estimated">{hoursText(i.loggedHours)}/{hoursText(i.estimateHours)}</span>}
                    {i.dueDate && <span className={`small ${isLate(i.dueDate, i.status) ? 'late-t' : 'muted'}`}>{fmtDate(i.dueDate)}</span>}
                    {i.comments.length > 0 && <span className="muted small">{i.comments.length} comment{i.comments.length > 1 ? 's' : ''}</span>}
                  </div>
                  {canMove && <button className="btn sm kcard-go" onClick={() => quick(i)}>{NEXT_LABEL[i.status]}</button>}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
