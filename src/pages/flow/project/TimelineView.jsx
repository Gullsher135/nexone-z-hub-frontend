import { useEffect, useMemo, useRef, useState } from 'react';
import { fmtDate } from '../../../lib/format.js';
import { localToday, timelineModel } from '../../../lib/flowView.js';
import { STATUS_TONE, isLate } from '../shared.jsx';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ZOOM = { day: 28, week: 10 };

// A Gantt-style chart: a bar from start to due date for every card, grouped by milestone.
export default function TimelineView({ items, milestones, project, onOpen }) {
  const today = localToday();
  const [zoom, setZoom] = useState('day');
  const dayPx = ZOOM[zoom];
  const scroller = useRef(null);
  const dated = items.filter((i) => i.startDate || i.dueDate);
  const undated = items.filter((i) => !i.startDate && !i.dueDate);
  const model = useMemo(() => timelineModel({ items: dated, milestones, project, today, dayPx }), [dated.length, milestones, project, today, dayPx, items]);

  // open with today in view, not at the far left of the range
  useEffect(() => { if (scroller.current) scroller.current.scrollLeft = Math.max(0, model.todayX - 240); }, [zoom, model.todayX]);

  const groups = [
    ...milestones.map((m) => ({ key: m._id, title: m.name, milestone: m, cards: dated.filter((i) => i.milestone === m._id) })),
    { key: 'none', title: 'No milestone', milestone: null, cards: dated.filter((i) => !i.milestone || !milestones.some((m) => m._id === i.milestone)) },
  ].filter((g) => g.cards.length > 0 || g.milestone);
  const weekStyle = { backgroundImage: `repeating-linear-gradient(to right, var(--line-2) 0, var(--line-2) 1px, transparent 1px, transparent ${dayPx * 7}px)` };

  if (dated.length === 0 && milestones.length === 0) {
    return <div className="panel panel-pad muted">Give cards a start or due date to see them on the timeline.{undated.length ? ` ${undated.length} card${undated.length > 1 ? 's have' : ' has'} no dates yet.` : ''}</div>;
  }

  const Track = ({ children }) => <div className="tl-track" style={{ width: model.width, ...weekStyle }}><span className="tl-today" style={{ left: model.todayX }} />{children}</div>;

  return (
    <div className="panel">
      <div className="row" style={{ padding: '12px 16px', gap: 10 }}>
        <span className="muted small grow">Bars run from the start date to the due date. A card with only a due date shows as a marker.</span>
        <div className="seg"><button type="button" className={zoom === 'day' ? 'on' : ''} onClick={() => setZoom('day')}>Days</button><button type="button" className={zoom === 'week' ? 'on' : ''} onClick={() => setZoom('week')}>Weeks</button></div>
      </div>
      <div className="tl-scroll" ref={scroller}>
        <div className="tl" style={{ minWidth: 240 + model.width }}>
          <div className="tl-row tl-head">
            <div className="tl-label" />
            <div className="tl-track" style={{ width: model.width }}>
              {model.months.map((m) => <div key={m.label} className="tl-month" style={{ width: m.days * dayPx }}>{MONTHS[Number(m.label.slice(5)) - 1]} {m.label.slice(0, 4)}</div>)}
            </div>
          </div>
          {groups.map((g) => (
            <div key={g.key}>
              <div className="tl-row tl-group">
                <div className="tl-label"><b>{g.title}</b>{g.milestone && <span className="muted small"> {g.milestone.dueDate ? `due ${fmtDate(g.milestone.dueDate)}` : ''}</span>}</div>
                <Track>{g.milestone?.dueDate && model.inRange(g.milestone.dueDate) && <span className="tl-diamond" style={{ left: model.x(g.milestone.dueDate) + dayPx / 2 }} title={`Milestone: ${g.title}`} />}</Track>
              </div>
              {g.cards.slice().sort((a, b) => (a.startDate || a.dueDate).localeCompare(b.startDate || b.dueDate)).map((i) => {
                const bar = model.bar(i);
                return (
                  <div className="tl-row" key={i._id}>
                    <div className="tl-label"><button type="button" className="link-btn" onClick={() => onOpen(i._id)} title={i.title}>{i.title}</button></div>
                    <Track>
                      {bar && (
                        <button type="button" className={`tl-bar ${STATUS_TONE[i.status]} ${isLate(i.dueDate, i.status) ? 'late' : ''} ${bar.single ? 'single' : ''}`} style={{ left: bar.left, width: bar.width }} onClick={() => onOpen(i._id)} title={`${i.title}${i.startDate ? ` · from ${fmtDate(i.startDate)}` : ''}${i.dueDate ? ` · due ${fmtDate(i.dueDate)}` : ''}`}>
                          {bar.width > 70 && <span>{i.title}</span>}
                        </button>
                      )}
                    </Track>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {undated.length > 0 && (
        <div className="panel-pad" style={{ borderTop: '1px solid var(--line-2)' }}>
          <div className="muted small" style={{ marginBottom: 6 }}>No dates yet ({undated.length})</div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>{undated.map((i) => <button key={i._id} type="button" className="chip muted link-chip" onClick={() => onOpen(i._id)}>{i.title}</button>)}</div>
        </div>
      )}
    </div>
  );
}
