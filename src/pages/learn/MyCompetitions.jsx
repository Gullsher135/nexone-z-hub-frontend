import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAsync } from '../../lib/useAsync.js';
import { Empty, Loading, Modal } from '../../components.jsx';
import { fmtDate } from '../../lib/format.js';
import { STATUS } from './Competitions.jsx';

function Board({ id, onClose }) {
  const state = useAsync(() => api.get(`/lms/my/competitions/${id}`), [id]);
  const d = state.data;
  return (
    <Modal title={d ? `Results: ${d.title}` : 'Results'} onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}>
      <Loading state={state}>
        {d && (d.board.length === 0 ? <Empty title="No ranking yet">The ranking appears here after the results are published.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Rank</th><th>Name</th><th>Score</th><th>Award</th></tr></thead>
            <tbody>{d.board.map((r, n) => <tr key={n} style={r.me ? { fontWeight: 700 } : undefined}><td>{r.rank || '-'}</td><td>{r.name}{r.me ? ' (you)' : ''}</td><td>{r.score ?? '-'}{r.score != null && d.maxScore ? ` / ${d.maxScore}` : ''}</td><td>{r.awardText || '-'}</td></tr>)}</tbody>
          </table></div>
        ))}
      </Loading>
    </Modal>
  );
}

// The competitions a student was chosen for, their result and their certificate.
export default function MyCompetitions() {
  const state = useAsync(() => api.get('/lms/my/competitions'), []);
  const [open, setOpen] = useState(null);
  const items = state.data?.items || [];
  return (
    <>
      <div className="page-head"><div><h1>Competitions</h1><p className="sub">Contests you take part in, your result and your certificates.</p></div></div>
      <Loading state={state}>
        {state.data && (items.length === 0 ? <div className="panel"><Empty title="No competitions yet">When your teacher adds you to a competition it appears here.</Empty></div> : (
          <div className="stack">
            {items.map((c) => (
              <div className="panel panel-pad stack" key={c._id}>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0 }} className="grow">{c.title}</h2>
                  <span className="chip info">{STATUS[c.status]}</span>
                </div>
                <div className="muted small">{c.code} · {c.date ? fmtDate(c.date, true) : 'No date set'} · {c.count} students</div>
                {c.description && <div>{c.description}</div>}
                {c.result ? (
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {c.result.awardText && <span className="chip ok">{c.result.awardText}</span>}
                    {c.result.rank && <span className="chip muted">Position {c.result.rank}</span>}
                    {c.result.score != null && <span className="chip muted">Score {c.result.score}{c.result.maxScore ? ` / ${c.result.maxScore}` : ''}</span>}
                    {c.result.note && <span className="small">{c.result.note}</span>}
                  </div>
                ) : <div className="muted small">Results have not been published yet.</div>}
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  {c.published && <button className="btn sm" onClick={() => setOpen(c._id)}>See the ranking</button>}
                  {c.certificate && <Link className="btn sm primary" to={`/verify/${c.certificate}`}>View and print certificate</Link>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </Loading>
      {open && <Board id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
