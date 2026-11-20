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

// ---- what Flow tracks: project, product or SaaS (the words here are shown to the team when they create one) ----
export const KIND_ORDER = ['project', 'product', 'saas'];
export const KINDS = {
  project: {
    label: 'Project', plural: 'Projects', path: 'projects', tone: 'muted',
    short: 'Built for one client, delivered once.',
    defines: 'Client work with a fixed scope, budget and deadline. We build it once for one client, deliver it and hand it over. It ends when it is delivered.',
    example: 'A website for a client, a custom mobile app, a one-off integration.',
    due: 'Deadline', budget: 'Budget (Rs)',
  },
  product: {
    label: 'Product', plural: 'Products', path: 'products', tone: 'ok',
    short: 'Built by us, sold to many customers as a package.',
    defines: 'Software we build ourselves and sell or license to many customers as a package. It has versions and releases and a roadmap, and no fixed end date.',
    example: 'A school management system sold with a one-time licence, a desktop tool, a template pack.',
    due: 'Target launch (optional)', budget: 'Development budget (Rs)',
  },
  saas: {
    label: 'SaaS', plural: 'SaaS', path: 'saas', tone: 'info',
    short: 'Hosted by us, customers pay by subscription.',
    defines: 'A product we host online and customers use by subscription, monthly or yearly. One running system serves many customers. We ship updates continuously and look after uptime, support and billing.',
    example: 'NexoneZ Hub offered to institutes for a monthly fee.',
    due: 'Target launch (optional)', budget: 'Development budget (Rs)',
  },
};
export const kindOf = (p) => KINDS[p?.kind] || KINDS.project;
export const KindChip = ({ kind = 'project' }) => <span className={`chip ${(KINDS[kind] || KINDS.project).tone}`}>{(KINDS[kind] || KINDS.project).label}</span>;
export const STAGES = { idea: 'Idea', building: 'Building', beta: 'Beta', live: 'Live', maintenance: 'Maintenance' };
export const STAGE_TONE = { idea: 'muted', building: 'info', beta: 'warn', live: 'ok', maintenance: 'muted' };
export const RELEASE_TYPES = { major: 'Major', minor: 'Minor', patch: 'Patch', hotfix: 'Hotfix' };
export const RELEASE_TONE = { major: 'info', minor: 'ok', patch: 'muted', hotfix: 'bad' };
export const DOC_CATEGORIES = { requirements: 'Requirements', design: 'Design', technical: 'Technical', contract: 'Contract', report: 'Report', meeting: 'Meeting notes', other: 'Other' };
export const fileSize = (n = 0) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);
export const extOf = (name = '') => (name.includes('.') ? name.split('.').pop().slice(0, 4).toUpperCase() : 'FILE');
