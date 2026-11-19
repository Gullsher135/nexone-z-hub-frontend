import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAsync } from '../../lib/useAsync.js';
import { useToast } from '../../lib/toast.jsx';
import { Empty, Field, Loading, Modal } from '../../components.jsx';
import { fmtDate } from '../../lib/format.js';
import { FileList, FilePicker } from '../../lib/files.jsx';
import { BatchPicker, batchState, batchPayload, forLabel } from './batchPicker.jsx';

const STANDARD_RUBRIC = [
  { name: 'Content and knowledge', maxMarks: 10 },
  { name: 'Slides design', maxMarks: 5 },
  { name: 'Delivery and confidence', maxMarks: 5 },
  { name: 'Answering questions', maxMarks: 5 },
  { name: 'Time management', maxMarks: 5 },
];
const STATUS_LABEL = { assigned: 'Not presented yet', presented: 'Presented', absent: 'Absent' };
const when = (p) => (p.date ? `${fmtDate(p.date, true)}${p.time ? ` at ${p.time}` : ''}` : 'Date not set');

// ============================ TEACHER ============================

function PresentationForm({ course, item, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({
    title: item?.title || '', description: item?.description || '', date: item?.date || '', time: item?.time || '', durationMin: item?.durationMin ?? 5,
    askSlides: item?.askSlides ?? true, published: item?.published ?? true,
    rubric: item?.rubric?.length ? item.rubric.map((r) => ({ ...r })) : STANDARD_RUBRIC.map((r) => ({ ...r })), ...batchState(item),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const total = f.rubric.reduce((s, r) => s + (Number(r.maxMarks) || 0), 0);
  const upR = (i, patch) => setF((x) => ({ ...x, rubric: x.rubric.map((r, n) => (n === i ? { ...r, ...patch } : r)) }));

  async function save(e) {
    e.preventDefault();
    setError('');
    if (f.batchMode === 'some' && f.batches.length === 0) return setError('Choose at least one batch, or select all batches.');
    const { batchMode, rubric, ...rest } = f; // eslint-disable-line no-unused-vars
    const body = { ...rest, batches: batchPayload(f), durationMin: Number(f.durationMin), rubric: rubric.map((r) => ({ _id: r._id, name: r.name, maxMarks: Number(r.maxMarks) })) };
    setBusy(true);
    try {
      if (item) await api.patch(`/lms/presentations/${item._id}`, body); else await api.post(`/lms/courses/${course._id}/presentations`, body);
      toast('Presentation saved');
      onSaved();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <Modal wide title={item ? 'Edit presentation' : 'New presentation'} onClose={onClose}
      footer={<><span className="muted small grow">Total {total} marks</span><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" form="pres-form" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button></>}>
      <form id="pres-form" onSubmit={save} className="stack">
        {error && <div className="alert bad" role="alert">{error}</div>}
        <div className="form-grid">
          <Field label="Title" full><input type="text" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required autoFocus placeholder="e.g. Final project presentation" /></Field>
          <Field label="What students should prepare" full><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="Date"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Start time"><input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
          <Field label="Minutes per student"><input type="number" min="1" max="180" value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: e.target.value })} /></Field>
          <BatchPicker course={course} value={f} onChange={(v) => setF((x) => ({ ...x, ...v }))} />
          <label className="check full"><input type="checkbox" checked={f.askSlides} onChange={(e) => setF({ ...f, askSlides: e.target.checked })} /> Students can upload their slides (PPT, PDF) or add a link</label>
          <label className="check full"><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} /> Visible to students</label>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <div className="row"><b className="grow">What is marked</b><button type="button" className="btn sm" onClick={() => setF({ ...f, rubric: STANDARD_RUBRIC.map((r) => ({ ...r })) })}>Use the standard list</button></div>
          {f.rubric.map((r, i) => (
            <div className="row" key={i} style={{ gap: 8 }}>
              <input type="text" className="grow" value={r.name} placeholder="e.g. Slides design" onChange={(e) => upR(i, { name: e.target.value })} aria-label={`Marking item ${i + 1}`} required />
              <input type="number" min="1" max="100" value={r.maxMarks} onChange={(e) => upR(i, { maxMarks: e.target.value })} style={{ width: 90 }} aria-label="Marks" required />
              <button type="button" className="btn sm ghost" disabled={f.rubric.length === 1} onClick={() => setF({ ...f, rubric: f.rubric.filter((_, n) => n !== i) })}>Remove</button>
            </div>
          ))}
          {f.rubric.length < 15 && <div><button type="button" className="btn" onClick={() => setF({ ...f, rubric: [...f.rubric, { name: '', maxMarks: 5 }] })}>Add a marking item</button></div>}
        </div>
      </form>
    </Modal>
  );
}

// One student: slides, status, and a mark for every item.
function MarkEntry({ entry, presentation, onClose, onSaved }) {
  const toast = useToast();
  const [status, setStatus] = useState(entry.status === 'assigned' ? 'presented' : entry.status);
  const [marks, setMarks] = useState(() => Object.fromEntries(presentation.rubric.map((c) => [String(c._id), String(entry.scores.find((s) => String(s.criterion) === String(c._id))?.marks ?? '')])));
  const [comment, setComment] = useState(entry.comment || '');
  const [busy, setBusy] = useState(false);
  const total = presentation.rubric.reduce((s, c) => s + (Number(marks[String(c._id)]) || 0), 0);

  async function save() {
    setBusy(true);
    try {
      await api.patch(`/lms/presentation-entries/${entry._id}/grade`, { status, comment, scores: presentation.rubric.map((c) => ({ criterion: c._id, marks: marks[String(c._id)] })) });
      toast('Marks saved');
      onSaved();
    } catch (e) { toast(e.message, 'bad'); setBusy(false); }
  }

  return (
    <Modal wide title={entry.student.name} onClose={onClose}
      footer={<><span className="muted small grow">{status === 'presented' ? `Total ${total} / ${presentation.maxTotal}` : STATUS_LABEL[status]}</span><button className="btn" onClick={onClose}>Close</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save marks'}</button></>}>
      <div className="stack">
        <div><div className="muted small">Topic</div><b>{entry.topic || 'No topic assigned'}</b></div>
        {(entry.slideFiles.length > 0 || entry.slideLinks.length > 0) && (
          <div className="stack" style={{ gap: 6 }}>
            <div className="muted small">Slides from the student</div>
            <FileList files={entry.slideFiles} />
            {entry.slideLinks.map((l) => <a key={l} href={l} target="_blank" rel="noreferrer noopener">{l}</a>)}
          </div>
        )}
        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          {Object.entries({ presented: 'Presented', absent: 'Absent', assigned: 'Not presented yet' }).map(([v, l]) => (
            <label className="check" key={v}><input type="radio" name="pstatus" checked={status === v} onChange={() => setStatus(v)} /> {l}</label>
          ))}
        </div>
        {status === 'presented' && presentation.rubric.map((c) => (
          <div className="mark-box" key={c._id}>
            <Field label={`${c.name} (of ${c.maxMarks})`}><input type="number" min="0" max={c.maxMarks} step="0.5" value={marks[String(c._id)]} onChange={(e) => setMarks({ ...marks, [String(c._id)]: e.target.value })} /></Field>
            <div className="muted small">{marks[String(c._id)] === '' ? 'Not marked' : `${marks[String(c._id)]} / ${c.maxMarks}`}</div>
          </div>
        ))}
        {status === 'absent' && <div className="alert warn">An absent student gets 0 for this presentation.</div>}
        <Field label="Comment for the student (optional)"><textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} /></Field>
      </div>
    </Modal>
  );
}

// All students of the batch(es): topics and marks in one place.
function Entries({ presentation, onClose, onChanged }) {
  const toast = useToast();
  const state = useAsync(() => api.get(`/lms/presentations/${presentation._id}/entries`), [presentation._id]);
  const [topics, setTopics] = useState({});
  const [pool, setPool] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [marking, setMarking] = useState(null);
  const [busy, setBusy] = useState(false);
  const d = state.data;

  useEffect(() => { if (d) setTopics(Object.fromEntries(d.entries.map((e) => [String(e.student._id), e.topic]))); }, [d]);
  const changed = d ? d.entries.filter((e) => (topics[String(e.student._id)] ?? '') !== e.topic) : [];

  async function saveTopics() {
    setBusy(true);
    try {
      await api.put(`/lms/presentations/${presentation._id}/topics`, { topics: changed.map((e) => ({ student: e.student._id, topic: topics[String(e.student._id)] || '' })) });
      toast('Topics saved');
      state.reload(); onChanged();
    } catch (e) { toast(e.message, 'bad'); } finally { setBusy(false); }
  }
  async function assign() {
    const list = pool.split('\n').map((t) => t.trim()).filter(Boolean);
    if (!list.length) return toast('Type the topics first, one on each line', 'bad');
    if (overwrite && !window.confirm('Replace the topics students already have?')) return;
    setBusy(true);
    try {
      const r = await api.post(`/lms/presentations/${presentation._id}/auto-assign`, { topics: list, overwrite });
      toast(`${r.assigned} topic${r.assigned === 1 ? '' : 's'} assigned${r.withoutTopic ? `. ${r.withoutTopic} student(s) still have none, add more topics.` : ''}${r.unusedTopics ? ` ${r.unusedTopics} topic(s) were not needed.` : ''}`);
      setPool('');
      state.reload(); onChanged();
    } catch (e) { toast(e.message, 'bad'); } finally { setBusy(false); }
  }

  return (
    <Modal wide title={`${presentation.title}: students and marks`} onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}>
      <Loading state={state}>
        {d && (
          <div className="stack">
            <div className="panel" style={{ padding: 14 }}>
              <b>Give every student a different topic</b>
              <p className="muted small" style={{ margin: '4px 0 8px' }}>Type the topics, one on each line. Each student gets one at random.</p>
              <textarea rows={4} value={pool} onChange={(e) => setPool(e.target.value)} placeholder={'Neural networks\nTransformers\nPrompt engineering'} aria-label="Topics" />
              <div className="row" style={{ gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                <button className="btn primary" onClick={assign} disabled={busy}>Assign at random</button>
                <label className="check"><input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} /> Replace topics that are already set</label>
              </div>
            </div>
            {d.duplicates.length > 0 && <div className="alert warn">Two students have the same topic: {d.duplicates.join(', ')}.</div>}
            {d.entries.length === 0 ? <Empty title="No students">Nobody is enrolled in the chosen batch yet.</Empty> : (
              <div>
                {d.entries.map((e) => (
                  <div className="list-row" key={e._id} style={{ alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 150 }}><b>{e.student.name}</b><div className="muted small">{e.batchName}</div></div>
                    <input type="text" className="grow" style={{ minWidth: 180 }} value={topics[String(e.student._id)] ?? ''} placeholder="Topic" maxLength={300} onChange={(ev) => setTopics({ ...topics, [String(e.student._id)]: ev.target.value })} aria-label={`Topic for ${e.student.name}`} />
                    <span className={`chip ${e.graded ? (e.status === 'absent' ? 'bad' : 'ok') : 'muted'}`}>{e.graded ? (e.status === 'absent' ? 'Absent' : `${e.total}/${d.presentation.maxTotal}`) : STATUS_LABEL[e.status]}</span>
                    {(e.slideFiles.length > 0 || e.slideLinks.length > 0) && <span className="chip info">Slides</span>}
                    <button className="btn sm primary" onClick={() => setMarking(e)}>{e.graded ? 'Edit marks' : 'Mark'}</button>
                  </div>
                ))}
                {changed.length > 0 && <div style={{ marginTop: 12 }}><button className="btn primary" onClick={saveTopics} disabled={busy}>Save {changed.length} changed topic{changed.length > 1 ? 's' : ''}</button></div>}
              </div>
            )}
          </div>
        )}
      </Loading>
      {marking && d && <MarkEntry entry={marking} presentation={d.presentation} onClose={() => setMarking(null)} onSaved={() => { setMarking(null); state.reload(); onChanged(); }} />}
    </Modal>
  );
}

export function ManagePresentations({ course }) {
  const toast = useToast();
  const state = useAsync(() => api.get(`/lms/courses/${course._id}/presentations`), [course._id]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(null);
  async function remove(p) {
    if (!window.confirm(`Delete "${p.title}", all topics, marks and slides?`)) return;
    try { await api.del(`/lms/presentations/${p._id}`); toast('Deleted'); state.reload(); } catch (e) { toast(e.message, 'bad'); }
  }
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}><div className="grow" /><button className="btn primary" onClick={() => setEditing('new')}>New presentation</button></div>
      <Loading state={state}>
        {state.data && (state.data.items.length === 0 ? <div className="panel"><Empty title="No presentations">Create one, give each student a topic, then mark it item by item.</Empty></div> : (
          <div className="panel">{state.data.items.map((p) => (
            <div className="list-row" key={p._id}>
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{p.title} {!p.published && <span className="chip muted">Hidden</span>}</div>
                <div className="muted small">{when(p)} · {p.durationMin} min each · {p.maxTotal} marks · {p.students} students, {p.withTopic} with a topic, {p.marked} marked · <b>{forLabel(p)}</b></div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm primary" onClick={() => setOpen(p)}>Students and marks</button>
                <button className="btn sm" onClick={() => setEditing(p)}>Edit</button>
                <button className="btn sm ghost" onClick={() => remove(p)}>Delete</button>
              </div>
            </div>
          ))}</div>
        ))}
      </Loading>
      {editing && <PresentationForm course={course} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); state.reload(); }} />}
      {open && <Entries presentation={open} onClose={() => setOpen(null)} onChanged={() => state.reload()} />}
    </>
  );
}

// ============================ STUDENT ============================

function SlidesForm({ p, onSaved }) {
  const toast = useToast();
  const [files, setFiles] = useState(p.entry?.slideFiles || []);
  const [links, setLinks] = useState(p.entry?.slideLinks || []);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await api.post(`/lms/presentations/${p._id}/slides`, { fileIds: files.map((f) => f.file), links: links.map((l) => l.trim()).filter(Boolean) });
      toast('Slides saved');
      onSaved();
    } catch (e) { toast(e.message, 'bad'); } finally { setBusy(false); }
  }
  return (
    <div className="stack" style={{ gap: 10 }}>
      <b>Your slides</b>
      <FilePicker course={p.course} kind="submission" files={files} onChange={setFiles} max={3} />
      {links.map((l, i) => (
        <div className="row" key={i} style={{ gap: 8 }}>
          <input type="url" className="grow" value={l} placeholder="https:// (Google Slides, Canva, Drive...)" onChange={(e) => setLinks(links.map((x, n) => (n === i ? e.target.value : x)))} aria-label={`Slides link ${i + 1}`} />
          <button type="button" className="btn sm ghost" onClick={() => setLinks(links.filter((_, n) => n !== i))}>Remove</button>
        </div>
      ))}
      <div className="row" style={{ gap: 8 }}>
        {links.length < 3 && <button type="button" className="btn" onClick={() => setLinks([...links, ''])}>Add a link</button>}
        <button type="button" className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save slides'}</button>
      </div>
    </div>
  );
}

export function StudentPresentations({ course }) {
  const state = useAsync(() => api.get(`/lms/courses/${course._id}/presentations`), [course._id]);
  return (
    <Loading state={state}>
      {state.data && (state.data.items.length === 0 ? <div className="panel"><Empty title="No presentations">Your teacher has not set a presentation for you yet.</Empty></div> : (
        <div className="stack">{state.data.items.map((p) => {
          const e = p.entry;
          const scoreOf = (c) => e?.scores?.find((s) => String(s.criterion) === String(c._id))?.marks;
          return (
            <div className="panel" style={{ padding: 16 }} key={p._id}>
              <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <b className="grow" style={{ fontSize: 17 }}>{p.title}</b>
                {e?.graded && (e.status === 'absent' ? <span className="chip bad">Absent</span> : <span className="chip ok">{e.total}/{p.maxTotal}</span>)}
              </div>
              <div className="muted small">{when(p)} · {p.durationMin} minutes · {p.maxTotal} marks</div>
              {p.description && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{p.description}</p>}
              <div className="alert info" style={{ margin: '12px 0' }}>
                {e?.topic ? <>Your topic: <b>{e.topic}</b></> : 'Your topic has not been given yet. Your teacher will assign it.'}
              </div>
              <div className="muted small" style={{ marginBottom: 4 }}>How you are marked</div>
              <div>{p.rubric.map((c) => (
                <div className="list-row" key={c._id} style={{ padding: '6px 0' }}>
                  <span className="grow">{c.name}</span>
                  <span className="muted small">{e?.graded && e.status === 'presented' && scoreOf(c) !== undefined ? <b>{scoreOf(c)} / {c.maxMarks}</b> : `${c.maxMarks} marks`}</span>
                </div>
              ))}</div>
              {e?.graded && e.comment && <p className="small" style={{ margin: '10px 0 0' }}>Teacher: {e.comment}</p>}
              {p.askSlides && !e?.graded && e?.topic && <div style={{ marginTop: 14 }}><SlidesForm key={`${p._id}-${(e.slideFiles || []).length}-${(e.slideLinks || []).length}`} p={p} onSaved={state.reload} /></div>}
              {e?.graded && (e.slideFiles?.length > 0 || e.slideLinks?.length > 0) && <div style={{ marginTop: 12 }}><FileList files={e.slideFiles} /></div>}
            </div>
          );
        })}</div>
      ))}
    </Loading>
  );
}
