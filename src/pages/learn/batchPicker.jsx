import { useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { useAsync } from '../../lib/useAsync.js';

// ---------- Who gets this? (assignments and quizzes) ----------
// mode 'all' = everyone enrolled; 'some' = only the ticked batches; 'students' = only the chosen students (the rest do not see it at all).
export const batchState = (item) => ({
  batchMode: item?.students?.length ? 'students' : item?.batches?.length ? 'some' : 'all',
  batches: (item?.batches || []).map(String),
  students: (item?.students || []).map(String),
});
export const batchPayload = (f) => (f.batchMode === 'some' ? f.batches : []);
export const studentPayload = (f) => (f.batchMode === 'students' ? f.students : []);
// Returns a message when the choice is incomplete, otherwise ''.
export const audienceError = (f) => (f.batchMode === 'some' && f.batches.length === 0 ? 'Choose at least one batch, or select all.' : f.batchMode === 'students' && f.students.length === 0 ? 'Choose at least one student, or select everyone.' : '');
export const forLabel = (item) => {
  if (item.students?.length) {
    const names = item.studentNames || [];
    return names.length <= 3 && names.length ? `Only ${names.join(', ')}` : `Only ${item.students.length} selected students`;
  }
  return item.batches?.length ? (item.batchNames?.join(', ') || 'Removed batch') : 'All batches';
};

export function BatchPicker({ course, value, onChange }) {
  const state = useAsync(() => api.get(`/lms/courses/${course._id}/batches`), [course._id]);
  const people = useAsync(() => (value.batchMode === 'students' ? api.get(`/lms/courses/${course._id}/students`) : Promise.resolve(null)), [course._id, value.batchMode === 'students']);
  const [q, setQ] = useState('');
  const list = state.data?.items || [];
  const students = (people.data?.items || []).map((e) => e.student).filter(Boolean);
  const shown = useMemo(() => { const t = q.trim().toLowerCase(); return t ? students.filter((s) => `${s.name} ${s.code}`.toLowerCase().includes(t)) : students; }, [students, q]);
  const toggle = (id) => onChange({ ...value, batches: value.batches.includes(id) ? value.batches.filter((x) => x !== id) : [...value.batches, id] });
  const toggleStudent = (id) => onChange({ ...value, students: value.students.includes(id) ? value.students.filter((x) => x !== id) : [...value.students, id] });
  const noBatches = state.data && list.length === 0;
  const mode = (m) => () => onChange({ ...value, batchMode: m });
  return (
    <div className="stack full" style={{ gap: 6 }}>
      <b className="small">Who can see this?</b>
      <label className="check"><input type="radio" name="batch-mode" checked={value.batchMode === 'all'} onChange={mode('all')} /> Everyone enrolled in this course</label>
      <label className="check"><input type="radio" name="batch-mode" checked={value.batchMode === 'some'} onChange={mode('some')} disabled={noBatches} /> Only selected batches{noBatches ? ' (this course has no batches yet)' : ''}</label>
      <label className="check"><input type="radio" name="batch-mode" checked={value.batchMode === 'students'} onChange={mode('students')} /> Only selected students <span className="muted small">(everyone else will not see it)</span></label>
      {value.batchMode === 'some' && (
        <div className="stack" style={{ gap: 4, paddingLeft: 24 }}>
          {state.loading && <span className="muted small">Loading batches...</span>}
          {list.map((b) => (
            <label className="check" key={b._id}><input type="checkbox" checked={value.batches.includes(String(b._id))} onChange={() => toggle(String(b._id))} /> {b.name}{b.isActive === false ? ' (finished)' : ''}<span className="muted small"> {b.enrolled} enrolled</span></label>
          ))}
        </div>
      )}
      {value.batchMode === 'students' && (
        <div className="stack" style={{ gap: 6, paddingLeft: 24 }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <input type="search" placeholder="Search students" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" style={{ maxWidth: 220 }} />
            <button type="button" className="btn sm" onClick={() => onChange({ ...value, students: [...new Set([...value.students, ...shown.map((s) => String(s._id))])] })}>Select shown</button>
            <button type="button" className="btn sm ghost" onClick={() => onChange({ ...value, students: [] })}>Clear</button>
            <span className="muted small">{value.students.length} selected</span>
          </div>
          {people.loading && <span className="muted small">Loading students...</span>}
          {!people.loading && students.length === 0 && <span className="muted small">Nobody is enrolled in this course yet.</span>}
          <div className="stack" style={{ gap: 2, maxHeight: 220, overflowY: 'auto' }}>
            {shown.map((s) => (
              <label className="check" key={s._id}><input type="checkbox" checked={value.students.includes(String(s._id))} onChange={() => toggleStudent(String(s._id))} /> {s.name}<span className="muted small"> {s.code}</span></label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
