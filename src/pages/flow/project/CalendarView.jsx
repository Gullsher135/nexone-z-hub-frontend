import { useState } from 'react';
import { Modal } from '../../../components.jsx';
import { fmtDate } from '../../../lib/format.js';
import { localToday, monthGrid } from '../../../lib/flowView.js';
import { STATUS_TONE, isLate } from '../shared.jsx';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Cards on the day they are due, with milestone dates marked.
export default function CalendarView({ items, milestones, canManage, onOpen, onCreate }) {
  const today = localToday();
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [day, setDay] = useState(null);
  const grid = monthGrid(ym.y, ym.m);
  const move = (n) => setYm(({ y, m }) => { const t = new Date(Date.UTC(y, m + n, 1)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() }; });
  const on = (key) => items.filter((i) => i.dueDate === key);
  const ms = (key) => milestones.filter((m) => m.dueDate === key);
  const undated = items.filter((i) => !i.dueDate).length;
  const dayItems = day ? on(day) : [];

  return (
    <div className="panel cal">
      <div className="cal-head">
        <button type="button" className="btn sm" onClick={() => move(-1)} aria-label="Previous month">Previous</button>
        <h2 className="grow" style={{ textAlign: 'center' }}>{MONTHS[ym.m]} {ym.y}</h2>
        <button type="button" className="btn sm" onClick={() => setYm({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 })}>Today</button>
        <button type="button" className="btn sm" onClick={() => move(1)} aria-label="Next month">Next</button>
      </div>
      <div className="cal-scroll">
        <div className="cal-grid cal-dow">{WEEK.map((w) => <div key={w}>{w}</div>)}</div>
        {grid.map((week, n) => (
          <div className="cal-grid" key={n}>
            {week.map((c) => {
              const list = on(c.key);
              const marks = ms(c.key);
              return (
                <div key={c.key} className={`cal-cell ${c.inMonth ? '' : 'out'} ${c.key === today ? 'today' : ''}`}>
                  <div className="cal-num"><span>{Number(c.key.slice(8))}</span>{canManage && c.inMonth && <button type="button" className="cal-add" aria-label={`Add a card due ${fmtDate(c.key)}`} onClick={() => onCreate(c.key)}>+</button>}</div>
                  {marks.map((m) => <div key={m._id} className="cal-ms" title={`Milestone: ${m.name}`}>◆ {m.name}</div>)}
                  {list.slice(0, 3).map((i) => (
                    <button key={i._id} type="button" className={`cal-item ${STATUS_TONE[i.status]} ${isLate(i.dueDate, i.status) ? 'late' : ''}`} onClick={() => onOpen(i._id)} title={i.title}>{i.title}</button>
                  ))}
                  {list.length > 3 && <button type="button" className="cal-more" onClick={() => setDay(c.key)}>+{list.length - 3} more</button>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {undated > 0 && <p className="muted small" style={{ padding: '10px 16px', margin: 0 }}>{undated} card{undated > 1 ? 's have' : ' has'} no due date, so {undated > 1 ? 'they do' : 'it does'} not appear here.</p>}
      {day && (
        <Modal title={`Due ${fmtDate(day, true)}`} onClose={() => setDay(null)} footer={<button className="btn" onClick={() => setDay(null)}>Close</button>}>
          <div className="stack">{dayItems.map((i) => <button key={i._id} type="button" className="link-btn" onClick={() => { setDay(null); onOpen(i._id); }}><b>{i.title}</b></button>)}</div>
        </Modal>
      )}
    </div>
  );
}
