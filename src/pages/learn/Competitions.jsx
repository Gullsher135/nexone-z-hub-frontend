import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAsync } from '../../lib/useAsync.js';
import { useToast } from '../../lib/toast.jsx';
import { Empty, Field, Loading, Modal } from '../../components.jsx';
import { fmtDate } from '../../lib/format.js';

export const AWARDS = { first: '1st Position', second: '2nd Position', third: '3rd Position', special: 'Special Award', participation: 'Participation' };
export const STATUS = { upcoming: 'Upcoming', running: 'Running', finished: 'Finished' };
const STATUS_TONE = { upcoming: 'info', running: 'warn', finished: 'ok' };

function CompetitionForm({ item, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ title: item?.title || '', description: item?.description || '', date: item?.date || '', status: item?.status || 'upcoming', maxScore: item?.maxScore ?? '', issuer: item?.issuer || 'NexoneZ Software House' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...f, maxScore: f.maxScore === '' ? null : Number(f.maxScore) };
      const r = item ? await api.patch(`/lms/competitions/${item._id}`, body) : await api.post('/lms/competitions', body);
      toast('Competition saved');
      onSaved(r.competition);
    } catch (err) { toast(err.message, 'bad'); setBusy(false); }
  }
  return (
    <Modal title={item ? 'Edit competition' : 'New competition'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" form="cmp-form" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button></>}>
      <form id="cmp-form" className="stack" onSubmit={save}>
        <Field label="Competition name"><input type="text" value={f.title} onChange={set('title')} required maxLength={140} autoFocus placeholder="Web Design Contest 2026" /></Field>
        <Field label="About it"><textarea rows="3" value={f.description} onChange={set('description')} maxLength={4000} /></Field>
        <div className="grid2">
          <Field label="Date"><input type="date" value={f.date} onChange={set('date')} /></Field>
          <Field label="Status"><select value={f.status} onChange={set('status')}>{Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Full marks (optional)" hint="Scores cannot go above this."><input type="number" min="1" value={f.maxScore} onChange={set('maxScore')} /></Field>
          <Field label="Awarded by" hint="Printed on the certificate."><input type="text" value={f.issuer} onChange={set('issuer')} maxLength={80} /></Field>
        </div>
      </form>
    </Modal>
  );
}

// The page that lists competitions (admin sees all, teachers see their own).
export default function Competitions({ teach = false }) {
  const base = teach ? '/teach' : '/admin/learn';
  const nav = useNavigate();
  const state = useAsync(() => api.get('/lms/competitions'), []);
  const [creating, setCreating] = useState(false);
  const items = state.data?.items || [];
  return (
    <>
      <div className="page-head"><div><h1>Competitions</h1><p className="sub">Run a contest, choose who takes part, record the results and give winners a certificate. Only the students you choose can see a competition.</p></div><button className="btn primary" onClick={() => setCreating(true)}>New competition</button></div>
      <Loading state={state}>
        {state.data && (items.length === 0 ? <div className="panel"><Empty title="No competitions yet">Press New competition to make the first one.</Empty></div> : (
          <div className="panel">
            {items.map((c) => (
              <Link key={c._id} to={`${base}/competitions/${c._id}`} className="list-row" style={{ color: 'inherit', textDecoration: 'none' }}>
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{c.title} <span className="muted small">{c.code}</span></div>
                  <div className="muted small">{c.date ? fmtDate(c.date, true) : 'No date'} · {c.participants} students · {c.winners} winners · {c.certificates} certificates</div>
                </div>
                <span className={`chip ${STATUS_TONE[c.status]}`}>{STATUS[c.status]}</span>
                {c.published ? <span className="chip ok">Results published</span> : <span className="chip muted">Results hidden</span>}
              </Link>
            ))}
          </div>
        ))}
      </Loading>
      {creating && <CompetitionForm onClose={() => setCreating(false)} onSaved={(c) => { setCreating(false); nav(`${base}/competitions/${c._id}`); }} />}
    </>
  );
}

// Choose which students take part (search, filter by batch, tick).
function AddStudents({ current, onClose, onDone, id }) {
  const toast = useToast();
  const pool = useAsync(() => api.get('/lms/pool'), []);
  const [q, setQ] = useState('');
  const [batch, setBatch] = useState('');
  const [picked, setPicked] = useState(() => new Set(current));
  const [busy, setBusy] = useState(false);
  const students = pool.data?.students || [];
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return students.filter((s) => (!batch || String(s.batch?._id) === batch) && (!t || `${s.name} ${s.code} ${s.rollNo || ''}`.toLowerCase().includes(t)));
  }, [students, q, batch]);
  const flip = (sid) => setPicked((p) => { const n = new Set(p); if (n.has(sid)) n.delete(sid); else n.add(sid); return n; });
  async function save() {
    setBusy(true);
    try { const r = await api.put(`/lms/competitions/${id}/participants`, { studentIds: [...picked] }); toast(r.added ? `${r.added} student${r.added > 1 ? 's' : ''} added and told` : 'Saved'); onDone(); } catch (e) { toast(e.message, 'bad'); setBusy(false); }
  }
  return (
    <Modal wide title="Who takes part?" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving...' : `Save (${picked.size} selected)`}</button></>}>
      <div className="stack">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input type="search" placeholder="Search by name, ID or roll number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" style={{ maxWidth: 280 }} autoFocus />
          <select value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="Batch" style={{ width: 'auto' }}><option value="">All batches</option>{(pool.data?.batches || []).map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</select>
          <button type="button" className="btn sm" onClick={() => setPicked((p) => new Set([...p, ...shown.map((s) => String(s._id))]))}>Select shown</button>
          <button type="button" className="btn sm ghost" onClick={() => setPicked(new Set())}>Clear all</button>
        </div>
        <Loading state={pool}>
          <div className="stack" style={{ gap: 2, maxHeight: 340, overflowY: 'auto' }}>
            {shown.map((s) => <label className="check" key={s._id}><input type="checkbox" checked={picked.has(String(s._id))} onChange={() => flip(String(s._id))} /> {s.name}<span className="muted small"> {s.code}{s.batch?.name ? ` · ${s.batch.name}` : ''}</span></label>)}
            {pool.data && shown.length === 0 && <div className="muted small">No student matches.</div>}
          </div>
        </Loading>
        <div className="muted small">People you add are told about the competition. People you remove lose their score and certificate.</div>
      </div>
    </Modal>
  );
}

// Take scores from a quiz: pick the course, then the quiz.
function ImportQuiz({ id, onClose, onDone }) {
  const toast = useToast();
  const courses = useAsync(() => api.get('/lms/courses'), []);
  const [course, setCourse] = useState('');
  const quizzes = useAsync(() => (course ? api.get(`/lms/courses/${course}/quizzes`) : Promise.resolve(null)), [course]);
  const [quiz, setQuiz] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { const r = await api.post(`/lms/competitions/${id}/import-quiz`, { quizId: quiz }); toast(`${r.imported} scores imported${r.missing ? `, ${r.missing} students have no marked attempt` : ''}`); onDone(); } catch (e) { toast(e.message, 'bad'); setBusy(false); }
  }
  return (
    <Modal title="Take scores from a quiz" onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={go} disabled={!quiz || busy}>{busy ? 'Importing...' : 'Import scores'}</button></>}>
      <div className="stack">
        <p className="muted small" style={{ margin: 0 }}>Each student gets their best marked attempt of the quiz as their score. You can still change any score afterwards.</p>
        <Field label="Course"><select value={course} onChange={(e) => { setCourse(e.target.value); setQuiz(''); }}><option value="">Choose a course</option>{(courses.data?.items || []).map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}</select></Field>
        {course && <Field label="Quiz"><select value={quiz} onChange={(e) => setQuiz(e.target.value)}><option value="">Choose a quiz</option>{(quizzes.data?.items || []).map((q) => <option key={q._id} value={q._id}>{q.title}</option>)}</select></Field>}
      </div>
    </Modal>
  );
}

export function CompetitionDetail({ teach = false }) {
  const { id } = useParams();
  const base = teach ? '/teach' : '/admin/learn';
  const nav = useNavigate();
  const toast = useToast();
  const state = useAsync(() => api.get(`/lms/competitions/${id}`), [id]);
  const c = state.data?.competition;
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [winners, setWinners] = useState(3);
  const [busy, setBusy] = useState('');
  useEffect(() => { if (c) setRows(c.participants.map((p) => ({ student: p.student, name: p.studentName, code: p.studentCode, score: p.score ?? '', rank: p.rank, award: p.award || '', awardTitle: p.awardTitle || '', note: p.note || '', cert: p.certificate?.code }))); }, [c]);

  const setRow = (sid, k, v) => setRows((r) => r.map((x) => (x.student === sid ? { ...x, [k]: v } : x)));
  const sorted = useMemo(() => [...rows].sort((a, b) => (a.rank || 9999) - (b.rank || 9999) || a.name.localeCompare(b.name)), [rows]);
  const payload = () => rows.map((r) => ({ student: r.student, score: r.score === '' ? null : Number(r.score), award: r.award, awardTitle: r.awardTitle, note: r.note }));
  async function run(name, fn, okText) {
    setBusy(name);
    try { const r = await fn(); if (okText) toast(typeof okText === 'function' ? okText(r) : okText); state.reload(); } catch (e) { toast(e.message, 'bad'); } finally { setBusy(''); }
  }
  const saveResults = () => run('save', () => api.put(`/lms/competitions/${id}/results`, { results: payload() }), 'Results saved');
  const autoRank = () => run('rank', async () => { await api.put(`/lms/competitions/${id}/results`, { results: payload() }); return api.post(`/lms/competitions/${id}/rank`, { winners }); }, (r) => `Ranked ${r.ranked} students, ${r.winners} winners marked`);
  const publish = (published) => run('pub', () => api.post(`/lms/competitions/${id}/publish`, { published }), published ? 'Results are now visible to the students, and they were told' : 'Results hidden again');
  const certify = (include) => run('cert', async () => { await api.put(`/lms/competitions/${id}/results`, { results: payload() }); return api.post(`/lms/competitions/${id}/certificates`, { include }); }, (r) => (r.issued ? `${r.issued} certificate${r.issued > 1 ? 's' : ''} issued and the students were told` : 'Nobody needs a certificate right now'));
  const revoke = (r) => window.confirm(`Take back the certificate of ${r.name}?`) && run('rev', () => api.del(`/lms/competitions/${id}/certificates/${r.student}`), 'Certificate removed');
  const removeAll = async () => { if (!window.confirm(`Delete ${c.title}, its results and its certificates? This cannot be undone.`)) return; try { await api.del(`/lms/competitions/${id}`); nav(`${base}/competitions`); } catch (e) { toast(e.message, 'bad'); } };

  const hasWinners = rows.some((r) => ['first', 'second', 'third', 'special'].includes(r.award));
  return (
    <Loading state={state}>
      {c && (
        <>
          <div className="page-head">
            <div>
              <div className="muted small"><Link to={`${base}/competitions`}>Competitions</Link> / {c.code}</div>
              <h1>{c.title} <span className={`chip ${STATUS_TONE[c.status]}`}>{STATUS[c.status]}</span></h1>
              <p className="sub">{c.date ? fmtDate(c.date, true) : 'No date set'}{c.maxScore ? ` · Full marks ${c.maxScore}` : ''}{c.quiz ? ` · Scores from quiz "${c.quiz.title}"` : ''}</p>
              {c.description && <p style={{ maxWidth: 640 }}>{c.description}</p>}
            </div>
            <div className="row" style={{ gap: 8 }}><button className="btn" onClick={() => setEditing(true)}>Edit</button></div>
          </div>

          <div className="stack">
            <div className="panel">
              <div className="panel-head"><h2>Participants ({rows.length})</h2><button className="btn sm primary" onClick={() => setAdding(true)}>Add or remove students</button></div>
              {rows.length === 0 ? <Empty title="Nobody yet">Add the students who take part. Only they can see this competition.</Empty> : <div className="panel-pad small muted">Only these {rows.length} students can see this competition. Scores and awards are entered below.</div>}
            </div>

            {rows.length > 0 && (
              <div className="panel">
                <div className="panel-head" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <h2 className="grow">Results</h2>
                  <button className="btn sm" onClick={() => setImporting(true)}>Take scores from a quiz</button>
                  <select value={winners} onChange={(e) => setWinners(Number(e.target.value))} aria-label="How many winners" style={{ width: 'auto' }}><option value={3}>Top 3 win</option><option value={2}>Top 2 win</option><option value={1}>Only 1st wins</option></select>
                  <button className="btn sm" onClick={autoRank} disabled={!!busy}>{busy === 'rank' ? 'Ranking...' : 'Rank by score'}</button>
                  <button className="btn sm primary" onClick={saveResults} disabled={!!busy}>{busy === 'save' ? 'Saving...' : 'Save results'}</button>
                </div>
                <div className="table-wrap"><table className="table">
                  <thead><tr><th>Rank</th><th>Student</th><th>Score</th><th>Award</th><th>Title on certificate</th><th>Note</th></tr></thead>
                  <tbody>
                    {sorted.map((r) => (
                      <tr key={r.student}>
                        <td>{r.rank || '-'}</td>
                        <td>{r.name} <span className="muted small">{r.code}</span></td>
                        <td><input type="number" min="0" max={c.maxScore || undefined} step="any" value={r.score} onChange={(e) => setRow(r.student, 'score', e.target.value)} aria-label={`Score of ${r.name}`} style={{ width: 90 }} /></td>
                        <td><select value={r.award} onChange={(e) => setRow(r.student, 'award', e.target.value)} aria-label={`Award of ${r.name}`}><option value="">None</option>{Object.entries(AWARDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
                        <td><input type="text" value={r.awardTitle} onChange={(e) => setRow(r.student, 'awardTitle', e.target.value)} placeholder="Optional, e.g. Best Design" maxLength={80} aria-label={`Title for ${r.name}`} /></td>
                        <td><input type="text" value={r.note} onChange={(e) => setRow(r.student, 'note', e.target.value)} maxLength={300} aria-label={`Note for ${r.name}`} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
                <div className="panel-pad muted small">Rank by score gives equal scores the same rank and marks the winners. You can then change any award by hand (for example a Special Award) and press Save.</div>
              </div>
            )}

            {rows.length > 0 && (
              <div className="panel">
                <div className="panel-head"><h2>Results and certificates</h2></div>
                <div className="panel-pad stack">
                  <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                    {c.published ? <><span className="chip ok">Students can see the results</span><button className="btn sm" onClick={() => publish(false)} disabled={!!busy}>Hide results again</button></> : <><span className="chip muted">Students cannot see the results yet</span><button className="btn sm primary" onClick={() => publish(true)} disabled={!!busy}>Publish results and tell students</button></>}
                  </div>
                  <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn" onClick={() => certify('winners')} disabled={!!busy || !hasWinners}>{busy === 'cert' ? 'Issuing...' : 'Give certificates to winners'}</button>
                    <button className="btn" onClick={() => window.confirm('Everyone without an award gets a participation certificate. Continue?') && certify('all')} disabled={!!busy}>Give certificates to everyone</button>
                  </div>
                  <div className="muted small">Winners get a Certificate of Achievement with their position. Everyone else (if you choose) gets a Certificate of Participation. Each certificate has a code and a QR code that anyone can check.</div>
                  {rows.filter((r) => r.cert).length > 0 && (
                    <div className="stack" style={{ gap: 0 }}>
                      {rows.filter((r) => r.cert).map((r) => (
                        <div className="list-row" key={r.student}>
                          <div className="grow"><b>{r.name}</b> <span className="muted small">{r.awardTitle || AWARDS[r.award] || 'Participation'} · {r.cert}</span></div>
                          <Link className="btn sm" to={`/verify/${r.cert}`} target="_blank">View and print</Link>
                          <button className="btn sm ghost" onClick={() => revoke(r)}>Take back</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <p><button className="btn ghost sm" onClick={removeAll}>Delete this competition</button></p>
          </div>
          {editing && <CompetitionForm item={c} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); state.reload(); }} />}
          {adding && <AddStudents id={id} current={c.participants.map((p) => String(p.student))} onClose={() => setAdding(false)} onDone={() => { setAdding(false); state.reload(); }} />}
          {importing && <ImportQuiz id={id} onClose={() => setImporting(false)} onDone={() => { setImporting(false); state.reload(); }} />}
        </>
      )}
    </Loading>
  );
}
