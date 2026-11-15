// Pure helpers for the Flow project views (no React inside, so they can be tested on their own).

const MS = 86400000;
const utc = (key) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const keyOf = (ms) => new Date(ms).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / MS);
export const addDays = (key, n) => keyOf(utc(key) + n * MS);
// Today in the browser's own time zone ('YYYY-MM-DD').
export const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// ---------- cards ----------
export const STATUS_ORDER = { todo: 0, doing: 1, review: 2, done: 3 };
export const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

export const isBlocked = (item) => (item.blockedBy || []).some((b) => b.status !== 'done');
export const checklistStats = (item) => { const list = item.checklist || []; return { done: list.filter((c) => c.done).length, total: list.length }; };
export const isOverdue = (item, today) => !!item.dueDate && item.status !== 'done' && item.dueDate < today;

export const EMPTY_FILTERS = { q: '', assignee: '', priority: '', type: '', label: '', milestone: '', hideDone: false, overdueOnly: false };
export const hasFilters = (f) => Object.keys(EMPTY_FILTERS).some((k) => f[k] !== EMPTY_FILTERS[k]);
export const labelsOf = (items) => [...new Set(items.flatMap((i) => i.labels || []))].sort((a, b) => a.localeCompare(b));

export function applyFilters(items, f, me, today = localToday()) {
  const q = f.q.trim().toLowerCase();
  return items.filter((i) => {
    if (q) {
      const hay = `${i.title} ${i.description || ''} ${(i.labels || []).join(' ')} ${i.assignee?.name || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.assignee === 'me') { if (i.assignee?._id !== me) return false; }
    else if (f.assignee === 'none') { if (i.assignee) return false; }
    else if (f.assignee && i.assignee?._id !== f.assignee) return false;
    if (f.priority && i.priority !== f.priority) return false;
    if (f.type && (i.type || 'task') !== f.type) return false;
    if (f.label && !(i.labels || []).some((l) => l.toLowerCase() === f.label.toLowerCase())) return false;
    if (f.milestone === 'none') { if (i.milestone) return false; }
    else if (f.milestone && i.milestone !== f.milestone) return false;
    if (f.hideDone && i.status === 'done') return false;
    if (f.overdueOnly && !isOverdue(i, today)) return false;
    return true;
  });
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export function sortItems(items, key, dir = 'asc') {
  const val = {
    title: (i) => i.title.toLowerCase(),
    status: (i) => STATUS_ORDER[i.status] ?? 9,
    priority: (i) => PRIORITY_ORDER[i.priority] ?? 9,
    assignee: (i) => (i.assignee?.name || '\uffff').toLowerCase(),
    type: (i) => i.type || 'task',
    due: (i) => i.dueDate || '9999-99-99', // cards without a date go last
    estimate: (i) => i.estimateHours || 0,
  }[key] || (() => 0);
  const sign = dir === 'desc' ? -1 : 1;
  // cards with no date / no assignee always go last, whichever way the column is sorted
  const empty = { due: (i) => !i.dueDate, assignee: (i) => !i.assignee }[key] || (() => false);
  return items.map((i, n) => [i, n]).sort(([a, an], [b, bn]) => (empty(a) !== empty(b) ? (empty(a) ? 1 : -1) : sign * cmp(val(a), val(b)) || an - bn)).map(([i]) => i);
}

// ---------- calendar ----------
// Weeks (Monday first) that cover the month. Each day: { key, inMonth }.
export function monthGrid(year, month) {
  const first = Date.UTC(year, month, 1);
  const lead = (new Date(first).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const weeks = Math.ceil((lead + daysInMonth) / 7);
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const ms = first + (w * 7 + d - lead) * MS;
    return { key: keyOf(ms), inMonth: new Date(ms).getUTCMonth() === month };
  }));
}

// ---------- timeline ----------
// The visible date range and where each bar sits, in pixels.
export function timelineModel({ items, milestones = [], project = {}, today, dayPx }) {
  const dates = [today, project.startDate, project.dueDate, ...milestones.map((m) => m.dueDate), ...items.flatMap((i) => [i.startDate, i.dueDate])].filter(Boolean).sort();
  let start = addDays(dates[0], -3);
  let end = addDays(dates[dates.length - 1], 7);
  if (daysBetween(start, end) > 400) end = addDays(start, 400); // keep the page light
  const total = daysBetween(start, end) + 1;

  const months = [];
  for (let n = 0; n < total; n++) {
    const k = addDays(start, n);
    const label = k.slice(0, 7);
    if (!months.length || months[months.length - 1].label !== label) months.push({ label, days: 0, first: k });
    months[months.length - 1].days++;
  }
  const x = (key) => daysBetween(start, key) * dayPx;
  const bar = (i) => {
    const a = i.startDate || i.dueDate;
    const b = i.dueDate || i.startDate;
    if (!a) return null;
    const s = a <= b ? a : b;
    const e = a <= b ? b : a;
    return { left: x(s), width: (daysBetween(s, e) + 1) * dayPx, single: s === e };
  };
  return { start, end, total, width: total * dayPx, months, x, bar, todayX: x(today) + dayPx / 2, inRange: (k) => k >= start && k <= end };
}
