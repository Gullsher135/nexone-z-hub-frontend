import { api } from '../../lib/api.js';
import { useAsync } from '../../lib/useAsync.js';

// ---------- Batch picker (assignments and quizzes) ----------
// mode 'all' = every batch of the course; 'some' = only the ticked batches.
export const batchState = (item) => ({ batchMode: item?.batches?.length ? 'some' : 'all', batches: (item?.batches || []).map(String) });
export const batchPayload = (f) => (f.batchMode === 'some' ? f.batches : []);
export const forLabel = (item) => (item.batches?.length ? (item.batchNames?.join(', ') || 'Removed batch') : 'All batches');

export function BatchPicker({ course, value, onChange }) {
  const state = useAsync(() => api.get(`/lms/courses/${course._id}/batches`), [course._id]);
  const list = state.data?.items || [];
  const toggle = (id) => onChange({ ...value, batches: value.batches.includes(id) ? value.batches.filter((x) => x !== id) : [...value.batches, id] });
  if (state.data && list.length === 0) return <div className="muted small full">This course has no batches yet, so this goes to everyone enrolled. Create batches in the Batches tab to send work to one batch only.</div>;
  return (
    <div className="stack full" style={{ gap: 6 }}>
      <b className="small">Who gets this?</b>
      <label className="check"><input type="radio" name="batch-mode" checked={value.batchMode === 'all'} onChange={() => onChange({ ...value, batchMode: 'all' })} /> All batches of this course</label>
      <label className="check"><input type="radio" name="batch-mode" checked={value.batchMode === 'some'} onChange={() => onChange({ ...value, batchMode: 'some' })} /> Only selected batches</label>
      {value.batchMode === 'some' && (
        <div className="stack" style={{ gap: 4, paddingLeft: 24 }}>
          {state.loading && <span className="muted small">Loading batches...</span>}
          {list.map((b) => (
            <label className="check" key={b._id}><input type="checkbox" checked={value.batches.includes(String(b._id))} onChange={() => toggle(String(b._id))} /> {b.name}{b.isActive === false ? ' (finished)' : ''}<span className="muted small"> {b.enrolled} enrolled</span></label>
          ))}
        </div>
      )}
    </div>
  );
}

