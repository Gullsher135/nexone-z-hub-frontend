export const PROJECT_STATUS = { planning: 'Planning', active: 'Active', on_hold: 'On hold', completed: 'Completed' };
export const PROJECT_TONE = { planning: 'muted', active: 'info', on_hold: 'warn', completed: 'ok' };
export const COLUMNS = [
  { key: 'todo', label: 'To do' },
  { key: 'doing', label: 'In progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];
export const NEXT = { todo: 'doing', doing: 'review', review: 'done' };
export const NEXT_LABEL = { todo: 'Start', doing: 'Send to review', review: 'Mark done' };
export const PRIORITY_TONE = { low: 'muted', medium: 'info', high: 'warn', urgent: 'bad' };
export const PRIORITIES = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
export const TYPES = { task: 'Task', bug: 'Bug', feature: 'Feature', improvement: 'Improvement' };
export const TYPE_TONE = { task: 'muted', bug: 'bad', feature: 'info', improvement: 'ok' };
export const STATUS_TONE = { todo: 'muted', doing: 'info', review: 'warn', done: 'ok' };
export const RAG = {
  green: { label: 'On track', tone: 'ok' }, amber: { label: 'At risk', tone: 'warn' }, red: { label: 'Late', tone: 'bad' },
  done: { label: 'Completed', tone: 'ok' }, none: { label: 'No cards yet', tone: 'muted' },
};
export const RagChip = ({ rag }) => (RAG[rag] ? <span className={`chip ${RAG[rag].tone}`}>{RAG[rag].label}</span> : null);
export const TypeChip = ({ type = 'task' }) => <span className={`chip ${TYPE_TONE[type] || 'muted'}`}>{TYPES[type] || type}</span>;
export const hoursText = (n) => `${Math.round((n || 0) * 10) / 10} h`;
export const when = (at) => new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const isLate = (due, status) => !!due && status !== 'done' && due < new Date().toISOString().slice(0, 10);
export const initials = (n = '?') => n.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export function Avatar({ name, size = 26 }) {
  return <span className="avatar" title={name} style={{ width: size, height: size, fontSize: size * 0.4 }}>{initials(name)}</span>;
}
