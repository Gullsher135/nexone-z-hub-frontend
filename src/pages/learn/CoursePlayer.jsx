import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAsync } from '../../lib/useAsync.js';
import { useToast } from '../../lib/toast.jsx';
import { fmtDate, todayKey } from '../../lib/format.js';
import { Cover, Empty, Field, Loading, Modal, ProgressBar, Tabs, LEVEL_LABEL } from '../../components.jsx';
import ProgressDetail from './ProgressDetail.jsx';
import { FileList, FilePicker } from '../../lib/files.jsx';
import { StudentPresentations } from './Presentations.jsx';
import { CodeBlock, SectionHead, groupSections, isAutoQ, marksLabel } from './quizParts.jsx';

function embedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.endsWith('youtube.com') && u.searchParams.get('v')) return `https://www.youtube-nocookie.com/embed/${u.searchParams.get('v')}`;
    if (u.hostname.endsWith('vimeo.com')) return `https://player.vimeo.com/video/${u.pathname.split('/').filter(Boolean).pop()}`;
    if (u.hostname === 'drive.google.com') return url.replace(/\/view.*$/, '/preview');
  } catch { /* not a valid link */ }
  return null;
}

function Lessons({ data, course, reload }) {
  const toast = useToast();
  const flat = useMemo(() => course.sections.flatMap((s) => s.lessons.map((l) => ({ ...l, section: s.title }))), [course]);
  const done = useMemo(() => new Set(data.enrollment.completedLessons), [data]);
  const [current, setCurrent] = useState(() => data.enrollment.lastLesson || flat[0]?._id);
  const [busy, setBusy] = useState(false);
  const lesson = flat.find((l) => String(l._id) === String(current)) || flat[0];
  const idx = flat.indexOf(lesson);
  const isDone = lesson && done.has(String(lesson._id));

  async function toggle(goNext) {
    setBusy(true);
    try {
      const r = await api.post(`/lms/courses/${course._id}/progress`, { lessonId: lesson._id, done: !isDone });
      if (r.certificate && !data.enrollment.certificate) toast('Course completed. Your certificate is ready!');
      await reload();
      if (goNext && !isDone && flat[idx + 1]) setCurrent(flat[idx + 1]._id);
    } catch (e) { toast(e.message, 'bad'); } finally { setBusy(false); }
  }

  if (!flat.length) return <div className="panel"><Empty title="No lessons yet">Your instructor has not added lessons to this course.</Empty></div>;
  const embed = lesson.url ? embedUrl(lesson.url) : null;

  return (
    <div className="player">
      <nav className="outline panel" aria-label="Course outline">
        {course.sections.map((s) => (
          <div key={s._id}>
            <div className="outline-sec">{s.title}</div>
            {s.lessons.map((l) => (
              <button key={l._id} className={`outline-item ${String(l._id) === String(lesson._id) ? 'on' : ''}`} onClick={() => setCurrent(l._id)}>
                <span className={`dot ${done.has(String(l._id)) ? 'done' : ''}`} aria-hidden="true">{done.has(String(l._id)) ? '✓' : ''}</span>
                <span className="grow">{l.title}</span>
                <span className="sr-only">{done.has(String(l._id)) ? 'completed' : 'not completed'}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <article className="lesson panel panel-pad">
        <div className="muted small">{lesson.section} · Lesson {idx + 1} of {flat.length}{lesson.durationMin ? ` · ${lesson.durationMin} min` : ''}</div>
        <h2 style={{ margin: '4px 0 14px' }}>{lesson.title}</h2>
        {embed && <div className="video"><iframe src={embed} title={lesson.title} allow="fullscreen; picture-in-picture" allowFullScreen loading="lazy" /></div>}
        {lesson.url && !embed && <p><a className="btn" href={lesson.url} target="_blank" rel="noreferrer noopener">Open {lesson.type === 'file' ? 'file' : 'link'}</a></p>}
        {lesson.content && <div className="prose">{lesson.content}</div>}
        <div className="row lesson-actions">
          <button className="btn" disabled={idx === 0} onClick={() => setCurrent(flat[idx - 1]._id)}>Previous</button>
          <div className="grow" />
          {isDone
            ? <button className="btn" onClick={() => toggle(false)} disabled={busy}>Mark as not done</button>
            : <button className="btn primary" onClick={() => toggle(true)} disabled={busy}>{idx < flat.length - 1 ? 'Complete and continue' : 'Complete course'}</button>}
          {isDone && idx < flat.length - 1 && <button className="btn primary" onClick={() => setCurrent(flat[idx + 1]._id)}>Next</button>}
        </div>
      </article>
    </div>
  );
}

function SubmitModal({ a, onClose, onDone }) {
  const toast = useToast();
  const [text, setText] = useState(a.submission?.text || '');
  const [links, setLinks] = useState(a.submission?.links?.length ? a.submission.links : a.submission?.link ? [a.submission.link] : []);
  const [files, setFiles] = useState(a.submission?.files || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function go(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`/lms/assignments/${a._id}/submit`, { text, links: links.map((l) => l.trim()).filter(Boolean), fileIds: files.map((f) => f.file) });
      toast('Submitted');
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal wide title={a.title} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" form="sub-form" disabled={busy}>{busy ? 'Submitting...' : a.submission ? 'Resubmit' : 'Submit'}</button></>}>
      {a.instructions && <div className="prose" style={{ marginBottom: 12 }}>{a.instructions}</div>}
      {a.attachments?.length > 0 && <div style={{ marginBottom: 16 }}><div className="muted small" style={{ marginBottom: 6 }}>Files from your teacher</div><FileList files={a.attachments} /></div>}
      <form id="sub-form" onSubmit={go} className="stack">
        {error && <div className="alert bad" role="alert">{error}</div>}
        <Field label={a.requireAttachment ? 'Your work (file or link required)' : 'Your work'} hint="Upload your assignment as PDF, Word, code files, zip or any format.">
          <FilePicker course={a.course} kind="submission" files={files} onChange={setFiles} />
        </Field>
        <Field label="Links to practical work (optional)" hint="GitHub repository, Google Colab, Google Drive, a live website or a demo video.">
          <div className="stack" style={{ gap: 8 }}>
            {links.map((l, i) => (
              <div className="row" key={i} style={{ gap: 8 }}>
                <input type="url" className="grow" value={l} placeholder="https://" onChange={(e) => setLinks(links.map((x, n) => (n === i ? e.target.value : x)))} aria-label={`Link ${i + 1}`} />
                <button type="button" className="btn sm ghost" onClick={() => setLinks(links.filter((_, n) => n !== i))}>Remove</button>
              </div>
            ))}
            {links.length < 5 && <div><button type="button" className="btn" onClick={() => setLinks([...links, ''])}>Add a link</button></div>}
          </div>
        </Field>
        <Field label="Note to the teacher (optional)"><textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} /></Field>
      </form>
    </Modal>
  );
}

function Assignments({ course }) {
  const state = useAsync(() => api.get(`/lms/courses/${course._id}/assignments`), [course._id]);
  const [open, setOpen] = useState(null);
  return (
    <Loading state={state}>
      {state.data && (state.data.items.length === 0 ? <div className="panel"><Empty title="No assignments">Nothing to submit in this course yet.</Empty></div> : (
        <div className="panel">{state.data.items.map((a) => {
          const s = a.submission;
          const overdue = a.dueDate && a.dueDate < todayKey();
          const handed = s ? [s.files?.length ? `${s.files.length} file${s.files.length > 1 ? 's' : ''}` : '', (s.links?.length || (s.link ? 1 : 0)) ? 'link' : ''].filter(Boolean).join(' + ') : '';
          return (
            <div className="list-row" key={a._id}>
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{a.title}</div>
                <div className="muted small">{a.dueDate ? `Due ${fmtDate(a.dueDate, true)}` : 'No deadline'} · {a.maxPoints} marks{a.attachments?.length ? ` · ${a.attachments.length} file${a.attachments.length > 1 ? 's' : ''} from teacher` : ''}{handed ? ` · You handed in ${handed}` : ''}</div>
                {s?.gradedAt && s.feedback && <div className="small" style={{ marginTop: 4 }}>Feedback: {s.feedback}</div>}
              </div>
              {s?.gradedAt ? <span className="chip ok">{s.grade}/{a.maxPoints}</span> : s ? <span className="chip info">Submitted{s.late ? ' (late)' : ''}</span> : <span className={`chip ${overdue ? 'bad' : 'warn'}`}>{overdue ? 'Overdue' : 'To do'}</span>}
              {!s?.gradedAt && <button className="btn sm primary" onClick={() => setOpen(a)} disabled={overdue && !a.allowLate && !s}>{s ? 'Edit' : 'Start'}</button>}
            </div>
          );
        })}</div>
      ))}
      {open && <SubmitModal a={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); state.reload(); }} />}
    </Loading>
  );
}

const fmtClock = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(s % 60).padStart(2, '0')}`;
};

const draftKey = (id) => `nz_quiz_draft_${id}`;
const loadDraft = (id) => { try { return JSON.parse(localStorage.getItem(draftKey(id)) || '{}'); } catch { return {}; } };
const saveDraft = (id, v) => { try { localStorage.setItem(draftKey(id), JSON.stringify(v)); } catch { /* storage full or blocked: ignore */ } };
const clearDraft = (id) => { try { localStorage.removeItem(draftKey(id)); } catch { /* ignore */ } };

function QuestionBox({ q, n, value, onChange, disabled }) {
  const v = value || {};
  return (
    <fieldset className="q-card" disabled={disabled}>
      <legend>{n}. {q.text} <span className="muted small">({marksLabel(q.points)})</span></legend>
      <CodeBlock code={q.code} />
      {(q.type === 'mcq' || q.type === 'tf' || !q.type) && q.options.map((o, oi) => (
        <label key={oi} className={`opt-pick ${v.choice === oi ? 'on' : ''}`}>
          <input type="radio" name={`q${q._id}`} checked={v.choice === oi} onChange={() => onChange({ ...v, choice: oi })} /> {o}
        </label>
      ))}
      {q.type === 'short' && <textarea rows={4} value={v.text || ''} onChange={(e) => onChange({ ...v, text: e.target.value })} placeholder="Write your answer" aria-label={`Answer ${n}`} />}
      {q.type === 'code' && <textarea className="mono" rows={9} spellCheck={false} value={v.text || ''} onChange={(e) => onChange({ ...v, text: e.target.value })} placeholder="Write your answer or code here" aria-label={`Answer ${n}`} />}
    </fieldset>
  );
}

function QuizTake({ quizId, onClose, onDone }) {
  const toast = useToast();
  const state = useAsync(() => api.get(`/lms/quizzes/${quizId}`), [quizId]);
  const [paper, setPaper] = useState(null); // the quiz with its questions, once they are open
  const [attemptId, setAttemptId] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [answers, setAnswers] = useState({});
  const [left, setLeft] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const autoTried = useRef(false); // the timer sends once; if that fails the student can still press Submit

  const quiz = paper || state.data?.quiz;
  const timed = quiz?.timeLimit > 0;

  // Open the paper: straight away for an untimed quiz, or resume a timed one that is already running.
  useEffect(() => {
    const d = state.data;
    if (!d || paper) return;
    if (d.quiz.questions.length > 0) { setPaper(d.quiz); if (d.active) { setAttemptId(d.active._id); setDeadline(Date.now() + d.active.remainingMs); } }
  }, [state.data, paper]);

  const key = attemptId || quizId;
  useEffect(() => { if (paper) setAnswers(loadDraft(key)); }, [paper, key]);
  useEffect(() => { if (paper && !result) saveDraft(key, answers); }, [answers, paper, result, key]);

  async function begin() {
    setBusy(true);
    try {
      const r = await api.post(`/lms/quizzes/${quizId}/start`);
      setAttemptId(r.attempt._id);
      setDeadline(Date.now() + r.remainingMs);
      setPaper(r.quiz);
    } catch (e) { toast(e.message, 'bad'); } finally { setBusy(false); }
  }

  async function submit(auto = false) {
    if (sending.current || !paper || (auto && autoTried.current)) return;
    if (auto) autoTried.current = true;
    const blank = paper.questions.filter((q) => { const a = answers[q._id] || {}; return (q.type === 'short' || q.type === 'code') ? !(a.text || '').trim() : a.choice === undefined || a.choice === null; }).length;
    if (!auto && blank && !window.confirm(`${blank} question${blank > 1 ? 's are' : ' is'} blank. Submit anyway?`)) return;
    sending.current = true;
    setBusy(true);
    try {
      const responses = paper.questions.map((q) => ({ question: q._id, choice: answers[q._id]?.choice ?? null, text: answers[q._id]?.text || '' }));
      const r = await api.post(`/lms/quizzes/${quizId}/attempt`, { responses });
      clearDraft(key);
      setResult(r);
      if (auto) toast('Time is up. Your answers were submitted.');
    } catch (e) { toast(e.message, 'bad'); sending.current = false; } finally { setBusy(false); }
  }

  // Countdown. The server keeps the real clock; this only shows it and submits when it reaches zero.
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    if (!deadline || result) return undefined;
    const tick = () => { const ms = deadline - Date.now(); setLeft(ms); if (ms <= 0) submitRef.current(true); };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline, result]);

  const running = !!paper && !result;
  function close() {
    if (result) return onDone();
    if (running && !window.confirm(timed ? 'Leave the quiz? The timer keeps running, and you can come back to continue.' : 'Leave the quiz? Your answers stay on this device so you can continue.')) return undefined;
    return onClose();
  }

  let footer;
  if (result) footer = <button className="btn primary" onClick={onDone}>Done</button>;
  else if (running) footer = <><button className="btn" onClick={close}>Leave</button><button className="btn primary" onClick={() => submit(false)} disabled={busy}>{busy ? 'Submitting...' : 'Submit answers'}</button></>;
  else footer = <><button className="btn" onClick={onClose}>Cancel</button>{timed && quiz && <button className="btn primary" onClick={begin} disabled={busy || !state.data}>{busy ? 'Starting...' : `Start (${quiz.timeLimit} min)`}</button>}</>;

  return (
    <Modal wide title={quiz?.title || 'Quiz'} onClose={close} footer={footer}>
      <Loading state={state}>
        {quiz && result && (
          <div className="stack">
            {result.attempt.status === 'pending'
              ? <div className="alert info" style={{ fontSize: 16 }}>Handed in. Your multiple-choice and true/false part is <b>{result.attempt.score}</b> out of <b>{result.attempt.maxScore}</b> so far. Your written answers will be marked by your teacher, and the final result will appear in this quiz.</div>
              : <div className="alert ok" style={{ fontSize: 18 }}>You scored <b>{result.attempt.score}</b> out of <b>{result.attempt.maxScore}</b>.</div>}
            {result.attemptsLeft != null && <div className="muted small">Attempts left: {result.attemptsLeft}.</div>}
            {result.review && groupSections(paper.questions).map((g, gi) => (
              <div className="stack" key={gi}>
                <SectionHead g={g} />
                {g.items.filter(({ q }) => isAutoQ(q)).map(({ q, n }) => {
                  const r = result.review[n - 1];
                  return (
                    <div className="q-card" key={q._id}>
                      <b>{n}. {q.text}</b>
                      <CodeBlock code={q.code} />
                      {q.options.map((o, oi) => {
                        const cls = oi === r.correctIndex ? 'right' : oi === r.chosen ? 'wrong' : '';
                        return <div key={oi} className={`opt-review ${cls}`}>{o}{oi === r.correctIndex && ' (correct)'}{oi === r.chosen && oi !== r.correctIndex && ' (your answer)'}</div>;
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        {quiz && !result && !paper && (
          <div className="stack">
            {quiz.instructions && <div className="prose">{quiz.instructions}</div>}
            {quiz.description && <p className="muted">{quiz.description}</p>}
            <div className="alert info">{quiz.questionCount} questions · {quiz.totalPoints} marks · {quiz.timeLimit} minutes. The timer starts when you press Start and cannot be paused. If you close this screen the timer keeps running.</div>
          </div>
        )}
        {quiz && !result && paper && (
          <div className="stack">
            {deadline && left !== null && <div className={`quiz-timer ${left < 5 * 60000 ? 'low' : ''}`} role="timer" aria-label="Time left">Time left: {fmtClock(left)}</div>}
            {quiz.instructions && <div className="prose muted">{quiz.instructions}</div>}
            {quiz.description && <p className="muted">{quiz.description}</p>}
            {groupSections(paper.questions).map((g, gi) => (
              <div className="stack" key={gi}>
                <SectionHead g={g} />
                {g.items.map(({ q, n }) => <QuestionBox key={q._id} q={q} n={n} value={answers[q._id]} onChange={(v) => setAnswers((a) => ({ ...a, [q._id]: v }))} disabled={busy} />)}
              </div>
            ))}
          </div>
        )}
      </Loading>
    </Modal>
  );
}

// A finished attempt: marks per question, the teacher's feedback and (if the teacher allows) the correct answers.
function MyResult({ attemptId, onClose }) {
  const state = useAsync(() => api.get(`/lms/attempts/${attemptId}`), [attemptId]);
  const d = state.data;
  const resp = new Map((d?.attempt.responses || []).map((r) => [String(r.question), r]));
  return (
    <Modal wide title={d ? `Result: ${d.quiz.title}` : 'Result'} onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}>
      <Loading state={state}>
        {d && (
          <div className="stack">
            <div className={`alert ${d.attempt.status === 'pending' ? 'info' : 'ok'}`} style={{ fontSize: 18 }}>
              <b>{d.attempt.score}</b> out of <b>{d.attempt.maxScore}</b>{d.attempt.status === 'pending' ? ' so far. Some written answers are not marked yet.' : '.'}
            </div>
            {d.attempt.comment && <div className="small">Teacher's comment: {d.attempt.comment}</div>}
            {groupSections(d.quiz.questions).map((g, gi) => (
              <div className="stack" key={gi}>
                <SectionHead g={g} />
                {g.items.map(({ q, n }) => {
                  const r = resp.get(String(q._id)) || {};
                  const auto = isAutoQ(q);
                  return (
                    <div className="q-card" key={q._id}>
                      <div className="row"><b className="grow">{n}. {q.text}</b>{typeof r.marks === 'number' ? <span className="tag num">{r.marks}/{q.points}</span> : !auto && <span className="chip info">Not marked yet</span>}</div>
                      <CodeBlock code={q.code} />
                      {auto ? q.options.map((o, oi) => {
                        const cls = q.correctIndex !== undefined && oi === q.correctIndex ? 'right' : oi === r.choice ? 'wrong' : '';
                        return <div key={oi} className={`opt-review ${cls}`}>{o}{q.correctIndex !== undefined && oi === q.correctIndex && ' (correct)'}{oi === r.choice && oi !== q.correctIndex && ' (your answer)'}</div>;
                      }) : (
                        <>
                          <div className="muted small">Your answer</div>
                          <pre className="sub-text" style={{ margin: 0, fontFamily: q.type === 'code' ? undefined : 'inherit' }}>{r.text?.trim() ? r.text : 'No answer'}</pre>
                          {q.modelAnswer && <div className="model-ans"><b>Model answer:</b> {q.modelAnswer}</div>}
                          {r.feedback && <div className="small">Teacher: {r.feedback}</div>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Loading>
    </Modal>
  );
}

function Quizzes({ course, refresh }) {
  const state = useAsync(() => api.get(`/lms/courses/${course._id}/quizzes`), [course._id]);
  const [taking, setTaking] = useState(null);
  const [viewing, setViewing] = useState(null);
  return (
    <Loading state={state}>
      {state.data && (state.data.items.length === 0 ? <div className="panel"><Empty title="No quizzes">There are no quizzes in this course yet.</Empty></div> : (
        <div className="panel">{state.data.items.map((q) => {
          const out = q.maxAttempts && q.attemptsUsed >= q.maxAttempts && !q.inProgress;
          return (
            <div className="list-row" key={q._id}>
              <div className="grow"><div style={{ fontWeight: 600 }}>{q.title}</div>
                <div className="muted small">{q.kind === 'weekly' ? 'Weekly grand quiz' : 'Daily quiz'} · {q.questionCount} questions · {q.totalPoints} marks{q.timeLimit ? ` · ${q.timeLimit} min` : ''} · {q.maxAttempts ? `${q.attemptsUsed}/${q.maxAttempts} attempts used` : 'Unlimited attempts'}</div></div>
              {q.inProgress && <span className="chip warn">In progress</span>}
              {q.awaiting && <span className="chip info">Waiting for marks</span>}
              {q.best != null && <span className="chip ok">Best {q.best}/{q.maxScore}</span>}
              {q.lastAttemptId && <button className="btn sm" onClick={() => setViewing(q.lastAttemptId)}>View result</button>}
              <button className="btn sm primary" disabled={out} onClick={() => setTaking(q._id)}>{out ? 'No attempts left' : q.inProgress ? 'Continue' : q.attemptsUsed ? 'Try again' : 'Start'}</button>
            </div>
          );
        })}</div>
      ))}
      {taking && <QuizTake quizId={taking} onClose={() => { setTaking(null); state.reload(); }} onDone={() => { setTaking(null); state.reload(); refresh?.(); }} />}
      {viewing && <MyResult attemptId={viewing} onClose={() => setViewing(null)} />}
    </Loading>
  );
}

// Attendance + assignment marks + quiz marks, with the weak areas called out.
function MyProgress({ course }) {
  const state = useAsync(() => api.get(`/lms/courses/${course._id}/my-progress`), [course._id]);
  return <Loading state={state}>{state.data && <ProgressDetail data={state.data} />}</Loading>;
}

function Updates({ course }) {
  const state = useAsync(() => api.get(`/lms/courses/${course._id}/announcements`), [course._id]);
  return (
    <Loading state={state}>
      {state.data && (state.data.items.length === 0 ? <div className="panel"><Empty title="No updates">Announcements from your instructor appear here.</Empty></div> : (
        <div className="panel">{state.data.items.map((a) => (
          <div className="list-row" key={a._id}><div className="grow"><div style={{ fontWeight: 600 }}>{a.title}</div>{a.body && <div className="small">{a.body}</div>}
            <div className="muted small">{a.author?.name} · {new Date(a.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi', dateStyle: 'medium' })}</div></div></div>
        ))}</div>
      ))}
    </Loading>
  );
}

export default function CoursePlayer() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const [tab, setTab] = useState(sp.get('tab') || 'lessons');
  const state = useAsync(() => api.get(`/lms/courses/${id}`), [id]);
  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  const d = state.data;
  const c = d?.course;

  return (
    <>
      <p className="small" style={{ marginBottom: 10 }}><Link to="/learn/courses">My courses</Link></p>
      <Loading state={state}>
        {c && (
          <>
            <div className="course-head">
              <Cover course={c} big />
              <div className="grow">
                <h1>{c.title}</h1>
                <p className="muted">{LEVEL_LABEL[c.level]}{c.durationWeeks ? ` · ${c.durationWeeks} weeks` : ''}{c.instructors?.length ? ` · ${c.instructors.map((i) => i.name).join(', ')}` : ''}</p>
                <div className="row" style={{ gap: 12, marginTop: 8 }}>
                  <div className="grow" style={{ maxWidth: 360 }}><ProgressBar value={d.enrollment.progress} label="Course progress" /></div>
                  <b className="num">{d.enrollment.progress}%</b>
                  <button className="btn sm" onClick={() => setTab('progress')}>See breakdown</button>
                  {d.enrollment.certificate && <Link className="btn sm primary" to={`/verify/${d.enrollment.certificate.code}`}>View certificate</Link>}
                </div>
              </div>
            </div>
            <Tabs tabs={[{ value: 'lessons', label: 'Lessons' }, { value: 'assignments', label: 'Assignments' }, { value: 'quizzes', label: 'Quizzes' }, { value: 'presentations', label: 'Presentations' }, { value: 'progress', label: 'My progress' }, { value: 'updates', label: 'Updates' }]} value={tab} onChange={setTab} />
            {tab === 'lessons' && <Lessons data={d} course={c} reload={state.reload} />}
            {tab === 'assignments' && <Assignments course={c} />}
            {tab === 'quizzes' && <Quizzes course={c} refresh={state.reload} />}
            {tab === 'presentations' && <StudentPresentations course={c} />}
            {tab === 'progress' && <MyProgress course={c} />}
            {tab === 'updates' && <Updates course={c} />}
          </>
        )}
      </Loading>
    </>
  );
}
