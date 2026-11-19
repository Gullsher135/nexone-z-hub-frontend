import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAsync } from '../../lib/useAsync.js';
import { useAuth } from '../../lib/auth.jsx';
import { useToast } from '../../lib/toast.jsx';
import { fmtDate } from '../../lib/format.js';
import { Cover, Empty, Field, Loading, Modal, ProgressBar, Tabs, LEVEL_LABEL } from '../../components.jsx';
import ProgressDetail, { PART_LABEL, PART_SHORT } from './ProgressDetail.jsx';
import { FileList, FilePicker } from '../../lib/files.jsx';
import { BatchPicker, batchState, batchPayload, forLabel } from './batchPicker.jsx';
import { ManagePresentations } from './Presentations.jsx';
import { CodeBlock, SectionHead, groupSections, isAutoQ, marksLabel } from './quizParts.jsx';

const TABS = [
  { value: 'content', label: 'Lessons' },
  { value: 'batches', label: 'Batches' },
  { value: 'students', label: 'Students' },
  { value: 'assignments', label: 'Assignments' },
  { value: 'quizzes', label: 'Quizzes' },
  { value: 'presentations', label: 'Presentations' },
  { value: 'updates', label: 'Updates' },
  { value: 'details', label: 'Details' },
];
const LESSON_TYPES = [
  { value: 'reading', label: 'Reading' },
  { value: 'video', label: 'Video link' },
  { value: 'link', label: 'Web link' },
  { value: 'file', label: 'File link' },
];
const swap = (arr, i, j) => {
  const a = [...arr];
  if (j < 0 || j >= a.length) return a;
  [a[i], a[j]] = [a[j], a[i]];
  return a;
};

// ---------- Lessons ----------
function Curriculum({ course, reload }) {
  const toast = useToast();
  const [sections, setSections] = useState(() => JSON.parse(JSON.stringify(course.sections || [])));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null); // lesson being edited, as "s-l"

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const change = (fn) => { setSections((s) => fn(JSON.parse(JSON.stringify(s)))); setDirty(true); };

  async function save() {
    setBusy(true);
    try {
      await api.put(`/lms/courses/${course._id}/curriculum`, { sections });
      toast('Lessons saved');
      setDirty(false);
      reload();
    } catch (e) { toast(e.message, 'bad'); } finally { setBusy(false); }
  }

  return (
    <div className="stack">
      {sections.length === 0 && <div className="panel"><Empty title="No lessons yet">Add a section (a chapter or week), then add lessons inside it.</Empty></div>}
      {sections.map((s, si) => (
        <div className="panel" key={s._id || `n${si}`}>
          <div className="panel-head">
            <input className="inline-title" type="text" value={s.title} placeholder="Section title" aria-label="Section title" onChange={(e) => change((x) => { x[si].title = e.target.value; return x; })} />
            <div className="row" style={{ gap: 4 }}>
              <button className="btn sm ghost" aria-label="Move section up" disabled={si === 0} onClick={() => change((x) => swap(x, si, si - 1))}>Up</button>
              <button className="btn sm ghost" aria-label="Move section down" disabled={si === sections.length - 1} onClick={() => change((x) => swap(x, si, si + 1))}>Down</button>
              <button className="btn sm ghost" onClick={() => { if (!s.lessons.length || window.confirm('Delete this section and its lessons?')) change((x) => { x.splice(si, 1); return x; }); }}>Delete</button>
            </div>
          </div>
          {s.lessons.map((l, li) => {
            const key = `${si}-${li}`;
            return (
              <div className="lesson-edit" key={l._id || `n${li}`}>
                <div className="list-row">
                  <button className="lesson-toggle grow" onClick={() => setOpen(open === key ? null : key)} aria-expanded={open === key}>
                    <span className="tag">{LESSON_TYPES.find((t) => t.value === l.type)?.label || 'Reading'}</span>
                    <span className="title">{l.title || 'Untitled lesson'}</span>
                  </button>
                  <div className="row" style={{ gap: 4 }}>
                    <button className="btn sm ghost" aria-label="Move lesson up" disabled={li === 0} onClick={() => change((x) => { x[si].lessons = swap(x[si].lessons, li, li - 1); return x; })}>Up</button>
                    <button className="btn sm ghost" aria-label="Move lesson down" disabled={li === s.lessons.length - 1} onClick={() => change((x) => { x[si].lessons = swap(x[si].lessons, li, li + 1); return x; })}>Down</button>
                    <button className="btn sm ghost" onClick={() => change((x) => { x[si].lessons.splice(li, 1); return x; })}>Remove</button>
                  </div>
                </div>
                {open === key && (
                  <div className="form-grid lesson-form">
                    <Field label="Lesson title" full><input type="text" value={l.title} onChange={(e) => change((x) => { x[si].lessons[li].title = e.target.value; return x; })} /></Field>
                    <Field label="Type">
                      <select value={l.type || 'reading'} onChange={(e) => change((x) => { x[si].lessons[li].type = e.target.value; return x; })}>
                        {LESSON_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Minutes"><input type="number" min="0" value={l.durationMin ?? ''} onChange={(e) => change((x) => { x[si].lessons[li].durationMin = e.target.value ? Number(e.target.value) : undefined; return x; })} /></Field>
                    {(l.type || 'reading') !== 'reading' && (
                      <Field label="Link" full hint={l.type === 'video' ? 'A YouTube, Vimeo or Google Drive video link.' : 'Starts with https://'}>
                        <input type="url" value={l.url || ''} onChange={(e) => change((x) => { x[si].lessons[li].url = e.target.value; return x; })} placeholder="https://" />
                      </Field>
                    )}
                    <Field label={(l.type || 'reading') === 'reading' ? 'Lesson text' : 'Notes (optional)'} full>
                      <textarea rows={(l.type || 'reading') === 'reading' ? 9 : 3} value={l.content || ''} onChange={(e) => change((x) => { x[si].lessons[li].content = e.target.value; return x; })} />
                    </Field>
                  </div>
                )}
              </div>
            );
          })}
          <div className="panel-pad" style={{ paddingTop: 12 }}>
            <button className="btn sm" onClick={() => { change((x) => { x[si].lessons.push({ title: '', type: 'reading' }); return x; }); setOpen(`${si}-${s.lessons.length}`); }}>Add lesson</button>
          </div>
        </div>
      ))}
      <div className="row save-bar">
        <button className="btn" onClick={() => change((x) => { x.push({ title: `Section ${x.length + 1}`, lessons: [] }); return x; })}>Add section</button>
        <div className="grow" />
        {dirty && <span className="muted small">Unsaved changes</span>}
        <button className="btn primary" onClick={save} disabled={busy || !dirty}>{busy ? 'Saving...' : 'Save lessons'}</button>
      </div>
    </div>
  );
}

// ---------- Batches (they live inside the course) ----------
function BatchForm({ course, batch, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ name: batch?.name || '', instructor: batch?.instructor || '', schedule: batch?.schedule || '', startDate: batch?.startDate || '', endDate: batch?.endDate || '', isActive: batch?.isActive ?? true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (batch) await api.patch(`/lms/courses/${course._id}/batches/${batch._id}`, f); else await api.post(`/lms/courses/${course._id}/batches`, f);
      toast(batch ? 'Batch updated' : 'Batch created');
      onSaved();
    } catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title={batch ? 'Edit batch' : 'New batch'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" form="cbatch-form" disabled={busy}>{busy ? 'Saving...' : 'Save batch'}</button></>}>
      <form id="cbatch-form" className="stack" onSubmit={save}>
        {error && <div className="alert bad" role="alert">{error}</div>}
        <div className="form-grid">
          <Field label="Batch name" full><input type="text" value={f.name} onChange={set('name')} required autoFocus placeholder="Batch 1" /></Field>
          <Field label="Instructor"><input type="text" value={f.instructor} onChange={set('instructor')} /></Field>
          <Field label="Class timing"><input type="text" value={f.schedule} onChange={set('schedule')} placeholder="Mon to Fri, 4 to 6 pm" /></Field>
          <Field label="Start date"><input type="date" value={f.startDate} onChange={set('startDate')} /></Field>
          <Field label="End date"><input type="date" value={f.endDate} onChange={set('endDate')} /></Field>
          <label className="check full"><input type="checkbox" checked={f.isActive} onChange={(e) => setF((x) => ({ ...x, isActive: e.target.checked }))} /> Batch is running</label>
        </div>
      </form>
    </Modal>
  );
}

function LinkBatch({ course, options, onClose, onDone }) {
  const toast = useToast();
  const [id, setId] = useState(options[0]?._id || '');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { const r = await api.post(`/lms/courses/${course._id}/batches/link`, { batchId: id }); toast(`Batch added. ${r.enrolled} student${r.enrolled === 1 ? '' : 's'} enrolled.`); onDone(); } catch (e) { toast(e.message, 'bad'); setBusy(false); }
  }
  return (
    <Modal title="Add an existing batch" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={go} disabled={busy || !id}>{busy ? 'Adding...' : 'Add to this course'}</button></>}>
      <div className="stack">
        <p className="muted">These batches were created before batches belonged to courses. Everyone already in the chosen batch is enrolled in this course.</p>
        <Field label="Batch"><select value={id} onChange={(e) => setId(e.target.value)}>{options.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}</select></Field>
      </div>
    </Modal>
  );
}

function Batches({ course }) {
  const toast = useToast();
  const state = useAsync(() => api.get(`/lms/courses/${course._id}/batches`), [course._id]);
  const [editing, setEditing] = useState(null); // null | 'new' | batch
  const [linking, setLinking] = useState(false);
  async function remove(b) {
    if (!window.confirm(`Delete ${b.name}?`)) return;
    try { await api.del(`/lms/courses/${course._id}/batches/${b._id}`); toast('Batch deleted'); state.reload(); } catch (e) { toast(e.message, 'bad'); }
  }
  const d = state.data;
  return (
    <>
      <div className="row" style={{ marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <div className="grow muted">Batches of this course. Class attendance is taken per batch, and counts towards each student's progress here.</div>
        {d?.linkable.length > 0 && <button className="btn" onClick={() => setLinking(true)}>Add existing batch</button>}
        <button className="btn primary" onClick={() => setEditing('new')}>New batch</button>
      </div>
      <Loading state={state}>
        {d && (d.items.length === 0 ? (
          <div className="panel"><Empty title="No batches in this course yet">Create a batch, then enrol students into it from the Students tab.</Empty></div>
        ) : (
          <div className="panel table-wrap">
            <table className="table cards">
              <thead><tr><th>Batch</th><th>Instructor</th><th>Timing</th><th>Dates</th><th>Students</th><th>Status</th><th /></tr></thead>
              <tbody>
                {d.items.map((b) => (
                  <tr key={b._id}>
                    <td className="full"><div className="title" style={{ fontWeight: 600 }}>{b.name}</div></td>
                    <td>{b.instructor || '-'}</td>
                    <td>{b.schedule || '-'}</td>
                    <td className="nowrap small">{b.startDate ? fmtDate(b.startDate) : '-'}{b.endDate && ` to ${fmtDate(b.endDate)}`}</td>
                    <td>{b.studentCount}</td>
                    <td><span className={`chip ${b.isActive ? 'ok' : 'muted'}`}>{b.isActive ? 'Running' : 'Finished'}</span></td>
                    <td className="r nowrap">
                      <button className="btn sm" onClick={() => setEditing(b)}>Edit</button>{' '}
                      <button className="btn sm ghost" onClick={() => remove(b)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {d?.withoutBatch > 0 && <p className="muted small" style={{ marginTop: 10 }}>{d.withoutBatch} enrolled student{d.withoutBatch === 1 ? ' is' : 's are'} not placed in a batch of this course.</p>}
      </Loading>
      {editing && <BatchForm course={course} batch={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); state.reload(); }} />}
      {linking && <LinkBatch course={course} options={d.linkable} onClose={() => setLinking(false)} onDone={() => { setLinking(false); state.reload(); }} />}
    </>
  );
}

// ---------- Students ----------
function EnrollModal({ course, onClose, onDone }) {
  const toast = useToast();
  const pool = useAsync(() => api.get('/lms/pool'), []);
  const batches = useAsync(() => api.get(`/lms/courses/${course._id}/batches`), [course._id]);
  const [batchId, setBatchId] = useState('');
  const [picked, setPicked] = useState(new Set());
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => (pool.data?.students || []).filter((s) => !q || `${s.name} ${s.code} ${s.rollNo || ''}`.toLowerCase().includes(q.toLowerCase())), [pool.data, q]);
  const toggle = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allShown = list.length > 0 && list.every((s) => picked.has(s._id));
  const toggleAll = () => setPicked((p) => { const n = new Set(p); list.forEach((s) => (allShown ? n.delete(s._id) : n.add(s._id))); return n; });
  const courseBatches = batches.data?.items || [];
  useEffect(() => { if (!batchId && courseBatches.length) setBatchId(courseBatches[0]._id); }, [batches.data]); // eslint-disable-line react-hooks/exhaustive-deps

  async function go() {
    setBusy(true);
    try {
      const ids = [...picked];
      const r = batchId
        ? await api.post(`/lms/courses/${course._id}/batches/${batchId}/students`, { studentIds: ids })
        : await api.post(`/lms/courses/${course._id}/enroll`, { studentIds: ids });
      toast(batchId ? `${r.added} enrolled${r.updated ? `, ${r.updated} moved into the batch` : ''}` : `${r.added} enrolled${r.skipped ? `, ${r.skipped} already in the course` : ''}`);
      onDone();
    } catch (e) { toast(e.message, 'bad'); setBusy(false); }
  }

  return (
    <Modal wide title="Enrol students" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={go} disabled={busy || !picked.size}>{busy ? 'Enrolling...' : 'Enrol'}</button></>}>
      <Loading state={pool}>
        <div className="stack">
          <Field label="Batch of this course" hint={!courseBatches.length ? 'This course has no batches yet. Create one in the Batches tab, or enrol without a batch.' : batchId ? 'Students go into this batch. A student sits in one batch at a time, so anyone already in another batch is moved.' : 'Students are enrolled in the course without a batch, so no class attendance counts for them.'}>
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <option value="">No batch</option>
              {courseBatches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </Field>
          <div className="row" style={{ gap: 8 }}>
            <input className="grow" type="search" placeholder="Search students" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" />
            <button type="button" className="btn sm" onClick={toggleAll} disabled={!list.length}>{allShown ? 'Clear shown' : 'Select shown'}</button>
          </div>
          <div className="pick-list">
            {list.length === 0 && <div className="muted small" style={{ padding: 12 }}>No students found.</div>}
            {list.map((s) => (
              <label key={s._id} className="pick-row">
                <input type="checkbox" checked={picked.has(s._id)} onChange={() => toggle(s._id)} />
                <span className="grow"><b>{s.name}</b><span className="muted small"> {s.batch?.name || 'No batch'}{s.rollNo ? ` · Roll ${s.rollNo}` : ''}</span></span>
                <span className="muted small">{s.code}</span>
              </label>
            ))}
          </div>
          <div className="muted small">{picked.size} selected</div>
        </div>
      </Loading>
    </Modal>
  );
}

// One student's progress, split into attendance, assignments and quizzes.
function StudentProgress({ course, enrollment, onClose }) {
  const state = useAsync(() => api.get(`/lms/courses/${course._id}/students/${enrollment.student._id}/progress`), [enrollment.student._id]);
  return (
    <Modal wide title={`${enrollment.student.name}: progress`} onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}>
      <Loading state={state}>{state.data && <ProgressDetail data={state.data} />}</Loading>
    </Modal>
  );
}

function Students({ course }) {
  const { user } = useAuth();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [bf, setBf] = useState('');
  const state = useAsync(() => api.get(`/lms/courses/${course._id}/students`), [course._id]);

  async function remove(e) {
    if (!window.confirm(`Remove ${e.student.name} from this course? Their progress will be lost.`)) return;
    try { await api.del(`/lms/courses/${course._id}/enroll/${e.student._id}`); toast('Removed'); state.reload(); } catch (err) { toast(err.message, 'bad'); }
  }
  async function issue(e) {
    try { const r = await api.post(`/lms/courses/${course._id}/enroll/${e.student._id}/certificate`); toast(`Certificate ${r.certificate.code} issued`); state.reload(); } catch (err) { toast(err.message, 'bad'); }
  }
  const all = state.data?.items || [];
  const batchNames = [...new Set(all.map((e) => e.batch?.name).filter(Boolean))].sort();
  const items = all.filter((e) => !bf || (bf === '__none' ? !e.batch : e.batch?.name === bf));

  return (
    <>
      <div className="row" style={{ marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <div className="grow muted">{state.data ? `${items.length} of ${all.length} enrolled` : ''}</div>
        {all.length > 0 && (
          <select value={bf} onChange={(e) => setBf(e.target.value)} aria-label="Filter by batch" style={{ width: 'auto' }}>
            <option value="">All batches</option>
            {batchNames.map((n) => <option key={n} value={n}>{n}</option>)}
            <option value="__none">No batch</option>
          </select>
        )}
        <button className="btn primary" onClick={() => setAdding(true)}>Enrol students</button>
      </div>
      <Loading state={state}>
        {state.data && (all.length === 0 ? (
          <div className="panel"><Empty title="No students yet">Create a batch for this course, then enrol students into it.</Empty></div>
        ) : (
          <div className="panel table-wrap">
            <table className="table cards">
              <thead><tr><th>Student</th><th>Batch</th><th>Progress</th><th>Certificate</th><th className="r"> </th></tr></thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e._id}>
                    <td className="full"><div className="title" style={{ fontWeight: 600 }}>{e.student.name}</div><div className="muted small">{e.student.code}</div></td>
                    <td>{e.batch?.name || <span className="muted">-</span>}</td>
                    <td style={{ minWidth: 220 }}>
                      <div className="small num">{e.progress}%</div>
                      <ProgressBar value={e.progress} label={`${e.student.name} progress`} />
                      <div className="mini-parts" style={{ marginTop: 6 }}>
                        {['attendance', 'assignments', 'quizzes'].map((k) => (
                          <span key={k} className={`chip ${e.parts[k] === null ? 'muted' : e.parts[k] < 60 ? 'bad' : 'ok'}`} title={`${PART_LABEL[k]}${e.parts[k] === null ? ': no data yet' : ''}`}>
                            {PART_SHORT[k]} {e.parts[k] === null ? '-' : `${e.parts[k]}%`}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{e.certificate ? <span className="tag">{e.certificate}</span> : <span className="muted">-</span>}</td>
                    <td className="r">
                      <button className="btn sm primary" onClick={() => setViewing(e)}>Details</button>{' '}
                      {!e.certificate && user.role === 'admin' && <button className="btn sm" onClick={() => issue(e)}>Issue certificate</button>}{' '}
                      <button className="btn sm ghost" onClick={() => remove(e)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </Loading>
      {adding && <EnrollModal course={course} onClose={() => setAdding(false)} onDone={() => { setAdding(false); state.reload(); }} />}
      {viewing && <StudentProgress course={course} enrollment={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

// ---------- Assignments ----------
function AssignmentForm({ course, item, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ title: item?.title || '', instructions: item?.instructions || '', dueDate: item?.dueDate || '', maxPoints: item?.maxPoints ?? 100, allowLate: item?.allowLate ?? true, requireAttachment: item ? !!item.requireAttachment : true, ...batchState(item) });
  const [files, setFiles] = useState(item?.attachments || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    if (f.batchMode === 'some' && f.batches.length === 0) { setBusy(false); return setError('Choose at least one batch, or select all batches.'); }
    const { batchMode, ...rest } = f; // eslint-disable-line no-unused-vars
    const body = { ...rest, batches: batchPayload(f), attachmentIds: files.map((x) => x.file), dueDate: f.dueDate || undefined, maxPoints: Number(f.maxPoints) };
    try {
      if (item) await api.patch(`/lms/assignments/${item._id}`, body); else await api.post(`/lms/courses/${course._id}/assignments`, body);
      toast('Assignment saved');
      onSaved();
    } catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal wide title={item ? 'Edit assignment' : 'New assignment'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" form="assign-form" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button></>}>
      <form id="assign-form" onSubmit={save} className="form-grid">
        {error && <div className="alert bad full" role="alert">{error}</div>}
        <Field label="Title" full><input type="text" value={f.title} onChange={set('title')} required autoFocus /></Field>
        <Field label="Instructions" full><textarea rows={6} value={f.instructions} onChange={set('instructions')} /></Field>
        <Field label="Files for students (optional)" full hint="Upload the assignment PDF, starter code or data files."><FilePicker course={course._id} kind="assignment" files={files} onChange={setFiles} /></Field>
        <Field label="Due date"><input type="date" value={f.dueDate} onChange={set('dueDate')} /></Field>
        <Field label="Total marks"><input type="number" min="1" value={f.maxPoints} onChange={set('maxPoints')} required /></Field>
        <BatchPicker course={course} value={f} onChange={(v) => setF((x) => ({ ...x, ...v }))} />
        <label className="check full"><input type="checkbox" checked={f.requireAttachment} onChange={(e) => setF((x) => ({ ...x, requireAttachment: e.target.checked }))} /> Students must upload a file or add a link to their work</label>
        <label className="check full"><input type="checkbox" checked={f.allowLate} onChange={(e) => setF((x) => ({ ...x, allowLate: e.target.checked }))} /> Accept late work (it is marked as late)</label>
      </form>
    </Modal>
  );
}

function Submissions({ assignment, onClose }) {
  const toast = useToast();
  const state = useAsync(() => api.get(`/lms/assignments/${assignment._id}/submissions`), [assignment._id]);
  const [edit, setEdit] = useState({});
  async function grade(s) {
    const v = edit[s._id] || {};
    try {
      await api.patch(`/lms/submissions/${s._id}/grade`, { grade: v.grade ?? s.grade, feedback: v.feedback ?? s.feedback });
      toast('Marks saved');
      setEdit((x) => { const n = { ...x }; delete n[s._id]; return n; });
      state.reload();
    } catch (e) { toast(e.message, 'bad'); }
  }
  return (
    <Modal wide title={`Submissions: ${assignment.title}`} onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}>
      <Loading state={state}>
        {state.data && (state.data.items.length === 0 ? <Empty title="Nothing submitted yet" /> : (
          <div className="stack">
            {state.data.items.map((s) => {
              const v = edit[s._id] || {};
              return (
                <div className="sub-card" key={s._id}>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <b className="grow">{s.student?.name}</b>
                    {s.late && <span className="chip warn">Late</span>}
                    {s.gradedAt ? <span className="chip ok">{s.grade}/{assignment.maxPoints}</span> : <span className="chip muted">Not marked</span>}
                  </div>
                  <div className="muted small">Submitted {new Date(s.submittedAt).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}</div>
                  {s.files?.length > 0 && <FileList files={s.files} />}
                  {(s.links?.length ? s.links : s.link ? [s.link] : []).map((l) => <p key={l} style={{ margin: 0 }}><a href={l} target="_blank" rel="noreferrer noopener">{l}</a></p>)}
                  {s.text && <p className="sub-text">{s.text}</p>}
                  <div className="grade-row">
                    <Field label={`Marks (of ${assignment.maxPoints})`}><input type="number" min="0" max={assignment.maxPoints} value={v.grade ?? s.grade ?? ''} onChange={(e) => setEdit((x) => ({ ...x, [s._id]: { ...v, grade: e.target.value } }))} /></Field>
                    <Field label="Feedback"><input type="text" value={v.feedback ?? s.feedback ?? ''} onChange={(e) => setEdit((x) => ({ ...x, [s._id]: { ...v, feedback: e.target.value } }))} /></Field>
                    <button className="btn primary" onClick={() => grade(s)} disabled={(v.grade ?? s.grade) === undefined || (v.grade ?? s.grade) === ''}>Save marks</button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </Loading>
    </Modal>
  );
}

function Assignments({ course }) {
  const toast = useToast();
  const state = useAsync(() => api.get(`/lms/courses/${course._id}/assignments`), [course._id]);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  async function remove(a) {
    if (!window.confirm(`Delete "${a.title}" and all submissions?`)) return;
    try { await api.del(`/lms/assignments/${a._id}`); toast('Deleted'); state.reload(); } catch (e) { toast(e.message, 'bad'); }
  }
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}><div className="grow" /><button className="btn primary" onClick={() => setEditing('new')}>New assignment</button></div>
      <Loading state={state}>
        {state.data && (state.data.items.length === 0 ? <div className="panel"><Empty title="No assignments">Give students practical work and mark it here.</Empty></div> : (
          <div className="panel">
            {state.data.items.map((a) => (
              <div className="list-row" key={a._id}>
                <div className="grow">
                  <div className="title" style={{ fontWeight: 600 }}>{a.title}</div>
                  <div className="muted small">{a.dueDate ? `Due ${fmtDate(a.dueDate, true)}` : 'No deadline'} · {a.maxPoints} marks · {a.submissions} submitted, {a.graded} marked · <b>{forLabel(a)}</b></div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn sm primary" onClick={() => setViewing(a)}>Mark work</button>
                  <button className="btn sm" onClick={() => setEditing(a)}>Edit</button>
                  <button className="btn sm ghost" onClick={() => remove(a)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </Loading>
      {editing && <AssignmentForm course={course} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); state.reload(); }} />}
      {viewing && <Submissions assignment={viewing} onClose={() => { setViewing(null); state.reload(); }} />}
    </>
  );
}

// ---------- Quizzes ----------
// ---------- Quizzes: daily (multiple choice) and weekly grand quizzes (full paper with sections) ----------
let rowUid = 0;
const uid = () => { rowUid += 1; return `r${rowUid}`; };
const blankQ = (type = 'mcq') => ({ row: 'q', uid: uid(), type, text: '', code: '', options: type === 'mcq' ? ['', '', '', ''] : [], correctIndex: 0, points: 1, modelAnswer: '', showCode: false });
const blankSection = (title = '') => ({ row: 'section', uid: uid(), title });

// Flat question list from the server -> editable rows (a section row wherever the section name changes).
function rowsFromQuiz(questions) {
  const rows = [];
  let last = null;
  questions.forEach((q) => {
    const sec = q.section || '';
    if (sec !== last && (sec || last !== null)) rows.push(blankSection(sec));
    last = sec;
    rows.push({ row: 'q', uid: uid(), _id: q._id, type: q.type || 'mcq', text: q.text, code: q.code || '', options: q.type === 'tf' ? [] : [...(q.options || [])], correctIndex: q.correctIndex || 0, points: q.points, modelAnswer: q.modelAnswer || '', showCode: !!q.code });
  });
  return rows.length ? rows : [blankQ()];
}

// Teacher-friendly JSON (see the sample file) -> the same rows.
function rowsFromImport(data) {
  const rows = [];
  const letter = (a) => (typeof a === 'string' ? 'ABCDEF'.indexOf(a.trim().toUpperCase()) : Number(a));
  (data.sections || []).forEach((s) => {
    if (s.title) rows.push(blankSection(s.title));
    (s.questions || []).forEach((q) => {
      const type = ['mcq', 'tf', 'short', 'code'].includes(q.type) ? q.type : 'mcq';
      const r = { ...blankQ(type), text: String(q.text || ''), code: String(q.code || ''), points: Number(q.marks ?? q.points) || 1, modelAnswer: String(q.modelAnswer || ''), showCode: !!q.code };
      if (type === 'mcq') { r.options = (q.options || []).map(String); r.correctIndex = Math.max(0, letter(q.answer)); }
      if (type === 'tf') r.correctIndex = q.answer === false || String(q.answer).toLowerCase() === 'false' ? 1 : 0;
      rows.push(r);
    });
  });
  return rows;
}

function QuizForm({ course, item, onClose, onSaved }) {
  const toast = useToast();
  const full = useAsync(() => (item ? api.get(`/lms/quizzes/${item._id}`) : Promise.resolve(null)), [item?._id]);
  const [f, setF] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (f) return;
    if (!item) setF({ title: '', description: '', instructions: '', kind: 'daily', timeLimit: 0, revealAnswers: true, maxAttempts: 1, published: true, ...batchState(null), rows: [blankQ()] });
    else if (full.data) {
      const q = full.data.quiz;
      setF({ title: q.title, description: q.description || '', instructions: q.instructions || '', kind: q.kind || 'daily', timeLimit: q.timeLimit || 0, revealAnswers: q.revealAnswers !== false, maxAttempts: q.maxAttempts, published: q.published, ...batchState(q), rows: rowsFromQuiz(q.questions) });
    }
  }, [full.data, item, f]);

  const weekly = f?.kind === 'weekly';
  const upRow = (i, patch) => setF((x) => ({ ...x, rows: x.rows.map((r, n) => (n === i ? { ...r, ...patch } : r)) }));
  const addRow = (r) => setF((x) => ({ ...x, rows: [...x.rows, r] }));
  const move = (i, d) => setF((x) => { const rows = [...x.rows]; const j = i + d; if (j < 0 || j >= rows.length) return x; [rows[i], rows[j]] = [rows[j], rows[i]]; return { ...x, rows }; });
  const removeRow = (i) => setF((x) => ({ ...x, rows: x.rows.filter((_, n) => n !== i) }));
  const qRows = (f?.rows || []).filter((r) => r.row === 'q');
  const totalMarks = qRows.reduce((s, r) => s + (Number(r.points) || 0), 0);

  function setKind(kind) {
    setF((x) => ({ ...x, kind, revealAnswers: kind === 'weekly' ? false : true, timeLimit: kind === 'weekly' ? (x.timeLimit || 45) : 0, maxAttempts: kind === 'weekly' ? 1 : x.maxAttempts }));
  }

  async function importFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const rows = rowsFromImport(data);
      if (!rows.some((r) => r.row === 'q')) throw new Error('No questions found in the file');
      setF((x) => ({ ...x, title: data.title || x.title, description: data.description ?? x.description, instructions: data.instructions ?? x.instructions, kind: data.kind === 'weekly' ? 'weekly' : 'daily', timeLimit: Number(data.timeLimit) || 0, revealAnswers: data.revealAnswers !== undefined ? !!data.revealAnswers : x.revealAnswers, maxAttempts: data.maxAttempts ?? x.maxAttempts, rows }));
      toast(`Imported ${rows.filter((r) => r.row === 'q').length} questions. Check them, then save.`);
    } catch (err) { toast(`Could not read the file: ${err.message}`, 'bad'); }
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    if (f.batchMode === 'some' && f.batches.length === 0) return setError('Choose at least one batch, or select all batches.');
    const questions = [];
    let section = '';
    f.rows.forEach((r) => {
      if (r.row === 'section') { section = r.title.trim(); return; }
      const base = { _id: r._id, type: r.type, section, text: r.text, code: r.code, points: Number(r.points) || 1, modelAnswer: r.modelAnswer };
      if (r.type === 'mcq') {
        // the correct answer must still point at the same option after blanks are dropped
        const kept = r.options.map((o, i) => ({ o: o.trim(), i })).filter((x) => x.o);
        questions.push({ ...base, options: kept.map((x) => x.o), correctIndex: kept.findIndex((x) => x.i === r.correctIndex) });
      } else questions.push({ ...base, options: [], correctIndex: r.correctIndex });
    });
    const { batchMode, rows, ...rest } = f; // eslint-disable-line no-unused-vars
    const body = { ...rest, batches: batchPayload(f), maxAttempts: Number(f.maxAttempts), timeLimit: Number(f.timeLimit) || 0, questions };
    setBusy(true);
    try {
      if (item) await api.patch(`/lms/quizzes/${item._id}`, body); else await api.post(`/lms/courses/${course._id}/quizzes`, body);
      toast('Quiz saved');
      onSaved();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  let n = 0;
  return (
    <Modal wide title={item ? 'Edit quiz' : 'New quiz'} onClose={onClose}
      footer={<><span className="muted small grow">{qRows.length} questions · {totalMarks} marks</span><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" form="quiz-form" disabled={busy || !f}>{busy ? 'Saving...' : 'Save quiz'}</button></>}>
      {!f ? <Loading state={full}><div /></Loading> : (
        <form id="quiz-form" onSubmit={save} className="stack">
          {error && <div className="alert bad" role="alert">{error}</div>}
          <div className="form-grid">
            <Field label="Type of quiz" full hint={weekly ? 'Weekly grand quiz: sections with multiple choice, true/false, short answers and coding questions. Written answers are marked by you.' : 'Daily quiz: multiple choice and true/false only, marked automatically.'}>
              <select value={f.kind} onChange={(e) => setKind(e.target.value)}>
                <option value="daily">Daily quiz (marked automatically)</option>
                <option value="weekly">Weekly grand quiz (sections, written answers)</option>
              </select>
            </Field>
            <Field label="Quiz title" full><input type="text" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required autoFocus /></Field>
            {weekly && <Field label="Instructions for students" full><textarea rows={3} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} placeholder="Attempt all questions. Write neat answers..." /></Field>}
            <Field label="Attempts allowed" hint="0 means unlimited."><input type="number" min="0" max="20" value={f.maxAttempts} onChange={(e) => setF({ ...f, maxAttempts: e.target.value })} /></Field>
            <Field label="Time limit (minutes)" hint="0 means no timer. The paper opens when the student presses Start."><input type="number" min="0" max="300" value={f.timeLimit} onChange={(e) => setF({ ...f, timeLimit: e.target.value })} /></Field>
            <label className="check"><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} /> Visible to students</label>
            <label className="check"><input type="checkbox" checked={f.revealAnswers} onChange={(e) => setF({ ...f, revealAnswers: e.target.checked })} /> Show correct answers after the student finishes</label>
            <BatchPicker course={course} value={f} onChange={(v) => setF((x) => ({ ...x, ...v }))} />
          </div>
          {!item && weekly && (
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <label className="btn" style={{ cursor: 'pointer' }}>Import paper from a JSON file<input type="file" accept=".json,application/json" hidden onChange={importFile} /></label>
              <span className="muted small">Fills the sections and questions below from a file, so you do not type them one by one.</span>
            </div>
          )}
          {f.rows.map((r, i) => {
            if (r.row === 'section') {
              return (
                <div className="sec-head" key={r.uid}>
                  <input type="text" value={r.title} placeholder="Section title, e.g. Section A: Multiple Choice Questions" onChange={(e) => upRow(i, { title: e.target.value })} aria-label="Section title" />
                  <button type="button" className="btn sm ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">Up</button>
                  <button type="button" className="btn sm ghost" onClick={() => move(i, 1)} disabled={i === f.rows.length - 1} aria-label="Move down">Down</button>
                  <button type="button" className="btn sm ghost" onClick={() => removeRow(i)}>Remove section</button>
                </div>
              );
            }
            n += 1;
            const written = r.type === 'short' || r.type === 'code';
            return (
              <div className="q-card" key={r.uid}>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <b className="grow">Question {n}</b>
                  <select value={r.type} onChange={(e) => { const type = e.target.value; upRow(i, { type, options: type === 'mcq' ? (r.options.length ? r.options : ['', '', '', '']) : [], correctIndex: 0 }); }} aria-label="Question type">
                    <option value="mcq">Multiple choice</option>
                    <option value="tf">True / False</option>
                    {weekly && <option value="short">Short answer</option>}
                    {weekly && <option value="code">Coding / practical</option>}
                  </select>
                  <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Marks <input type="number" min="1" max="100" value={r.points} onChange={(e) => upRow(i, { points: e.target.value })} style={{ width: 70 }} /></label>
                  <button type="button" className="btn sm ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">Up</button>
                  <button type="button" className="btn sm ghost" onClick={() => move(i, 1)} disabled={i === f.rows.length - 1} aria-label="Move down">Down</button>
                  <button type="button" className="btn sm ghost" disabled={qRows.length === 1} onClick={() => removeRow(i)}>Remove</button>
                </div>
                <Field label="Question"><textarea rows={written ? 3 : 2} value={r.text} onChange={(e) => upRow(i, { text: e.target.value })} required /></Field>
                {r.showCode
                  ? <Field label="Code shown with the question"><textarea className="mono" rows={5} spellCheck={false} value={r.code} onChange={(e) => upRow(i, { code: e.target.value })} /></Field>
                  : <div><button type="button" className="btn sm ghost" onClick={() => upRow(i, { showCode: true })}>Add a code snippet to this question</button></div>}
                {r.type === 'mcq' && r.options.map((o, oi) => (
                  <div className="opt-row" key={oi}>
                    <input type="radio" name={`c${r.uid}`} checked={r.correctIndex === oi} onChange={() => upRow(i, { correctIndex: oi })} aria-label={`Option ${oi + 1} is correct`} />
                    <input type="text" value={o} placeholder={`Option ${oi + 1}`} onChange={(e) => upRow(i, { options: r.options.map((x, k) => (k === oi ? e.target.value : x)) })} aria-label={`Option ${oi + 1}`} />
                  </div>
                ))}
                {r.type === 'mcq' && <div className="muted small">Select the circle next to the correct answer. Leave unused options empty.</div>}
                {r.type === 'tf' && (
                  <div className="row" style={{ gap: 16 }}>
                    <label className="check"><input type="radio" name={`c${r.uid}`} checked={r.correctIndex === 0} onChange={() => upRow(i, { correctIndex: 0 })} /> True is correct</label>
                    <label className="check"><input type="radio" name={`c${r.uid}`} checked={r.correctIndex === 1} onChange={() => upRow(i, { correctIndex: 1 })} /> False is correct</label>
                  </div>
                )}
                {written && <Field label="Model answer (only you see this, it helps while marking)"><textarea rows={3} value={r.modelAnswer} onChange={(e) => upRow(i, { modelAnswer: e.target.value })} /></Field>}
              </div>
            );
          })}
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {weekly && <button type="button" className="btn" onClick={() => addRow(blankSection())}>Add section</button>}
            <button type="button" className="btn" onClick={() => addRow(blankQ('mcq'))}>Add multiple choice</button>
            <button type="button" className="btn" onClick={() => addRow(blankQ('tf'))}>Add true / false</button>
            {weekly && <button type="button" className="btn" onClick={() => addRow(blankQ('short'))}>Add short answer</button>}
            {weekly && <button type="button" className="btn" onClick={() => addRow(blankQ('code'))}>Add coding question</button>}
          </div>
        </form>
      )}
    </Modal>
  );
}

// Teacher marks one attempt: choice questions are already marked, written ones get marks and feedback here.
function MarkAttempt({ attemptId, onClose, onSaved }) {
  const toast = useToast();
  const state = useAsync(() => api.get(`/lms/attempts/${attemptId}`), [attemptId]);
  const [edit, setEdit] = useState(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const d = state.data;

  useEffect(() => {
    if (!d || edit) return;
    const m = {};
    d.attempt.responses.forEach((r) => { m[String(r.question)] = { marks: typeof r.marks === 'number' ? String(r.marks) : '', feedback: r.feedback || '' }; });
    setEdit(m);
    setComment(d.attempt.comment || '');
  }, [d, edit]);

  const resp = new Map((d?.attempt.responses || []).map((r) => [String(r.question), r]));
  const manualQs = (d?.quiz.questions || []).filter((q) => !isAutoQ(q));
  const manualTotal = manualQs.reduce((s, q) => s + (Number(edit?.[String(q._id)]?.marks) || 0), 0);
  const total = (d?.attempt.autoScore || 0) + manualTotal;
  const setM = (qid, patch) => setEdit((x) => ({ ...x, [qid]: { ...x[qid], ...patch } }));

  async function save() {
    setBusy(true);
    try {
      const marks = manualQs.map((q) => ({ question: q._id, marks: edit[String(q._id)]?.marks ?? '', feedback: edit[String(q._id)]?.feedback || '' }));
      await api.patch(`/lms/attempts/${attemptId}/grade`, { marks, comment });
      toast('Marks saved');
      onSaved();
    } catch (e) { toast(e.message, 'bad'); setBusy(false); }
  }

  return (
    <Modal wide title={d ? `${d.attempt.student?.name || 'Student'}: ${d.quiz.title}` : 'Mark quiz'} onClose={onClose}
      footer={<><span className="muted small grow">Total {total} / {d?.attempt.maxScore}</span><button className="btn" onClick={onClose}>Close</button>{manualQs.length > 0 && <button className="btn primary" onClick={save} disabled={busy || !edit}>{busy ? 'Saving...' : 'Save marks'}</button>}</>}>
      <Loading state={state}>
        {d && edit && (
          <div className="stack">
            <div className="muted small">Handed in {new Date(d.attempt.submittedAt).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}. Multiple-choice and true/false part: {d.attempt.autoScore ?? d.attempt.score} marks (automatic).</div>
            {d.attempt.comment === 'Not handed in before the time ended.' && <div className="alert warn">This student did not hand in before the time ended.</div>}
            {groupSections(d.quiz.questions).map((g, gi) => (
              <div className="stack" key={gi}>
                <SectionHead g={g} />
                {g.items.map(({ q, n }) => {
                  const r = resp.get(String(q._id)) || {};
                  const id = String(q._id);
                  if (isAutoQ(q)) {
                    return (
                      <div className="q-card" key={id}>
                        <div className="row"><b className="grow">{n}. {q.text}</b><span className={`chip ${r.marks > 0 ? 'ok' : 'bad'}`}>{r.marks ?? 0}/{q.points}</span></div>
                        <CodeBlock code={q.code} />
                        <div className="small">Chosen: <b>{r.choice != null ? q.options[r.choice] : 'No answer'}</b> · Correct: <b>{q.options[q.correctIndex]}</b></div>
                      </div>
                    );
                  }
                  return (
                    <div className="q-card" key={id}>
                      <b>{n}. {q.text} <span className="muted small">({marksLabel(q.points)})</span></b>
                      <CodeBlock code={q.code} />
                      <div className="muted small">Student's answer</div>
                      <pre className={`sub-text ${q.type === 'code' ? 'mono' : ''}`} style={{ margin: 0, fontFamily: q.type === 'code' ? undefined : 'inherit' }}>{r.text?.trim() ? r.text : 'No answer'}</pre>
                      {q.modelAnswer && <div className="model-ans"><b>Model answer:</b> {q.modelAnswer}</div>}
                      <div className="mark-box">
                        <Field label={`Marks (of ${q.points})`}><input type="number" min="0" max={q.points} step="0.5" value={edit[id]?.marks ?? ''} onChange={(e) => setM(id, { marks: e.target.value })} /></Field>
                        <Field label="Feedback (optional)"><input type="text" value={edit[id]?.feedback ?? ''} onChange={(e) => setM(id, { feedback: e.target.value })} maxLength={1000} /></Field>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <Field label="Comment for the student (optional)"><textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} /></Field>
          </div>
        )}
      </Loading>
    </Modal>
  );
}

function Attempts({ quiz, onClose, onChanged }) {
  const state = useAsync(() => api.get(`/lms/quizzes/${quiz._id}/attempts`), [quiz._id]);
  const [marking, setMarking] = useState(null);
  return (
    <Modal title={`Results: ${quiz.title}`} onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}>
      <Loading state={state}>
        {state.data && (state.data.items.length === 0 ? <Empty title="No attempts yet" /> : (
          <div>{state.data.items.map((a) => (
            <div className="list-row" key={a._id}>
              <div className="grow"><b>{a.student?.name}</b><div className="muted small">{new Date(a.submittedAt).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}</div></div>
              {a.status === 'pending' ? <span className="chip warn">Needs marking</span> : null}
              <span className="tag num">{a.score}/{a.maxScore}</span>
              {quiz.kind === 'weekly' || a.status === 'pending' ? <button className={`btn sm ${a.status === 'pending' ? 'primary' : ''}`} onClick={() => setMarking(a._id)}>{a.status === 'pending' ? 'Mark' : 'Review'}</button> : null}
            </div>
          ))}</div>
        ))}
      </Loading>
      {marking && <MarkAttempt attemptId={marking} onClose={() => setMarking(null)} onSaved={() => { setMarking(null); state.reload(); onChanged?.(); }} />}
    </Modal>
  );
}

function Quizzes({ course }) {
  const toast = useToast();
  const state = useAsync(() => api.get(`/lms/courses/${course._id}/quizzes`), [course._id]);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  async function remove(q) {
    if (!window.confirm(`Delete "${q.title}" and all results?`)) return;
    try { await api.del(`/lms/quizzes/${q._id}`); toast('Deleted'); state.reload(); } catch (e) { toast(e.message, 'bad'); }
  }
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}><div className="grow" /><button className="btn primary" onClick={() => setEditing('new')}>New quiz</button></div>
      <Loading state={state}>
        {state.data && (state.data.items.length === 0 ? <div className="panel"><Empty title="No quizzes">Create a daily quiz (marked automatically) or a weekly grand quiz with written and coding questions.</Empty></div> : (
          <div className="panel">{state.data.items.map((q) => (
            <div className="list-row" key={q._id}>
              <div className="grow"><div className="title" style={{ fontWeight: 600 }}>{q.title} <span className={`chip ${q.kind === 'weekly' ? 'info' : 'muted'}`}>{q.kind === 'weekly' ? 'Weekly grand' : 'Daily'}</span> {!q.published && <span className="chip muted">Hidden</span>} {q.toMark > 0 && <span className="chip warn">{q.toMark} to mark</span>}</div>
                <div className="muted small">{q.questionCount} questions · {q.totalPoints} marks{q.timeLimit ? ` · ${q.timeLimit} min` : ''} · {q.attempts} attempts · <b>{forLabel(q)}</b></div></div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm" onClick={() => setViewing(q)}>Results</button>
                <button className="btn sm" onClick={() => setEditing(q)}>Edit</button>
                <button className="btn sm ghost" onClick={() => remove(q)}>Delete</button>
              </div>
            </div>
          ))}</div>
        ))}
      </Loading>
      {editing && <QuizForm course={course} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); state.reload(); }} />}
      {viewing && <Attempts quiz={viewing} onClose={() => setViewing(null)} onChanged={() => state.reload()} />}
    </>
  );
}

// ---------- Updates ----------
function Updates({ course }) {
  const toast = useToast();
  const state = useAsync(() => api.get(`/lms/courses/${course._id}/announcements`), [course._id]);
  const [f, setF] = useState({ title: '', body: '' });
  const [busy, setBusy] = useState(false);
  async function post(e) {
    e.preventDefault();
    setBusy(true);
    try { await api.post(`/lms/courses/${course._id}/announcements`, f); setF({ title: '', body: '' }); toast('Posted'); state.reload(); } catch (err) { toast(err.message, 'bad'); } finally { setBusy(false); }
  }
  async function remove(a) {
    try { await api.del(`/lms/announcements/${a._id}`); state.reload(); } catch (err) { toast(err.message, 'bad'); }
  }
  return (
    <div className="stack">
      <form className="panel panel-pad stack" onSubmit={post}>
        <Field label="Title"><input type="text" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required placeholder="Tomorrow's class starts at 10am" /></Field>
        <Field label="Message"><textarea rows={3} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        <div><button className="btn primary" disabled={busy}>{busy ? 'Posting...' : 'Post to students'}</button></div>
      </form>
      <Loading state={state}>
        {state.data && state.data.items.length > 0 && (
          <div className="panel">{state.data.items.map((a) => (
            <div className="list-row" key={a._id}>
              <div className="grow"><div style={{ fontWeight: 600 }}>{a.title}</div>{a.body && <div className="small">{a.body}</div>}
                <div className="muted small">{a.author?.name} · {new Date(a.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi', dateStyle: 'medium' })}</div></div>
              <button className="btn sm ghost" onClick={() => remove(a)}>Delete</button>
            </div>
          ))}</div>
        )}
      </Loading>
    </div>
  );
}

// ---------- Details ----------
function Details({ course, reload, base }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const staff = useAsync(() => (user.role === 'admin' ? api.get('/lms/staff') : Promise.resolve({ items: [] })), []);
  const [f, setF] = useState({
    title: course.title, category: course.category || '', level: course.level, summary: course.summary || '', description: course.description || '',
    durationWeeks: course.durationWeeks ?? '', color: course.color ?? 0, autoCertificate: course.autoCertificate !== false,
    instructors: (course.instructors || []).map((i) => i._id),
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function save(extra = {}) {
    setBusy(true);
    try {
      const body = { ...f, durationWeeks: f.durationWeeks === '' ? undefined : Number(f.durationWeeks), color: Number(f.color), ...extra };
      if (user.role !== 'admin') delete body.instructors;
      await api.patch(`/lms/courses/${course._id}`, body);
      toast('Saved');
      reload();
    } catch (e) { toast(e.message, 'bad'); } finally { setBusy(false); }
  }
  async function destroy() {
    if (!window.confirm('Delete this course with all lessons, assignments, quizzes and student progress? This cannot be undone.')) return;
    try { await api.del(`/lms/courses/${course._id}`); toast('Course deleted'); navigate(base); } catch (e) { toast(e.message, 'bad'); }
  }
  const live = course.status === 'published';

  return (
    <div className="stack">
      <div className={`alert ${live ? 'ok' : 'warn'}`}>
        {live ? 'This course is live. Enrolled students can see it.' : 'This course is a draft. Students cannot see it until you publish.'}
        {' '}<button className="btn sm" style={{ marginLeft: 8 }} onClick={() => save({ status: live ? 'draft' : 'published' })} disabled={busy}>{live ? 'Move back to draft' : 'Publish course'}</button>
      </div>
      <form className="panel panel-pad form-grid" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Field label="Course title" full><input type="text" value={f.title} onChange={set('title')} required /></Field>
        <Field label="Category"><input type="text" value={f.category} onChange={set('category')} /></Field>
        <Field label="Level"><select value={f.level} onChange={set('level')}>{Object.entries(LEVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Duration (weeks)"><input type="number" min="0" value={f.durationWeeks} onChange={set('durationWeeks')} /></Field>
        <Field label="Colour">
          <div className="swatches">{[0, 1, 2, 3, 4, 5].map((c) => <button type="button" key={c} className={`swatch cc-${c} ${Number(f.color) === c ? 'on' : ''}`} aria-label={`Colour ${c + 1}`} onClick={() => setF((x) => ({ ...x, color: c }))} />)}</div>
        </Field>
        <Field label="Short summary" full><input type="text" value={f.summary} onChange={set('summary')} maxLength={240} /></Field>
        <Field label="About this course" full><textarea rows={5} value={f.description} onChange={set('description')} /></Field>
        {user.role === 'admin' && <label className="check full"><input type="checkbox" checked={f.autoCertificate} onChange={(e) => setF((x) => ({ ...x, autoCertificate: e.target.checked }))} /> Issue a certificate automatically when a student finishes every lesson</label>}
        {user.role === 'admin' && (
          <Field label="Teachers" full hint="Teachers chosen here can run this course: lessons, assignments, quizzes, marking and class attendance. Add people on the Teachers page.">
            <div className="pick-list">
              {(staff.data?.items || []).map((s) => (
                <label key={s._id} className="pick-row">
                  <input type="checkbox" checked={f.instructors.includes(s._id)} onChange={() => setF((x) => ({ ...x, instructors: x.instructors.includes(s._id) ? x.instructors.filter((i) => i !== s._id) : [...x.instructors, s._id] }))} />
                  <span className="grow"><b>{s.name}</b> <span className="muted small">{s.designation || s.role}</span></span>
                </label>
              ))}
              {staff.data && staff.data.items.length === 0 && <div className="muted small" style={{ padding: 12 }}>No teachers yet. Add one on the <Link to="/admin/learn/teachers">Teachers page</Link>.</div>}
            </div>
          </Field>
        )}
        <div className="full row"><button className="btn primary" disabled={busy}>{busy ? 'Saving...' : 'Save details'}</button><div className="grow" />
          {user.role === 'admin' && <button type="button" className="btn ghost" onClick={destroy}>Delete course</button>}</div>
      </form>
    </div>
  );
}

export default function CourseManage({ teach = false }) {
  const { id } = useParams();
  const base = teach ? '/teach' : '/admin/learn';
  const [tab, setTab] = useState('content');
  const state = useAsync(() => api.get(`/lms/courses/${id}`), [id]);
  const c = state.data?.course;

  return (
    <>
      <p className="small" style={{ marginBottom: 10 }}><Link to={base}>All courses</Link></p>
      <Loading state={state}>
        {c && (
          <>
            <div className="course-head">
              <Cover course={c} big />
              <div className="grow">
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <span className={`chip ${c.status === 'published' ? 'ok' : 'muted'}`}>{c.status === 'published' ? 'Live' : 'Draft'}</span>
                  <span className="tag">{c.code}</span>
                  {c.category && <span className="tag">{c.category}</span>}
                </div>
                <h1 style={{ marginTop: 6 }}>{c.title}</h1>
                <p className="muted">{LEVEL_LABEL[c.level]}{c.durationWeeks ? ` · ${c.durationWeeks} weeks` : ''} · {state.data.lessonCount} lessons</p>
              </div>
            </div>
            <Tabs tabs={TABS} value={tab} onChange={setTab} />
            {tab === 'content' && <Curriculum key={JSON.stringify(c.sections.map((s) => s._id))} course={c} reload={state.reload} />}
            {tab === 'batches' && <Batches course={c} />}
            {tab === 'students' && <Students course={c} />}
            {tab === 'assignments' && <Assignments course={c} />}
            {tab === 'quizzes' && <Quizzes course={c} />}
            {tab === 'presentations' && <ManagePresentations course={c} />}
            {tab === 'updates' && <Updates course={c} />}
            {tab === 'details' && <Details course={c} reload={state.reload} base={base} />}
          </>
        )}
      </Loading>
    </>
  );
}
