// Small pieces shared by the student and teacher quiz screens.
export const QTYPE_LABEL = { mcq: 'Multiple choice', tf: 'True / False', short: 'Short answer', code: 'Coding / practical' };
export const isAutoQ = (q) => !q.type || q.type === 'mcq' || q.type === 'tf';

// Groups questions under their section heading, keeping the original question numbers.
export function groupSections(questions) {
  const out = [];
  questions.forEach((q, i) => {
    const title = q.section || '';
    const last = out[out.length - 1];
    if (last && last.title === title) last.items.push({ q, n: i + 1 });
    else out.push({ title, items: [{ q, n: i + 1 }] });
  });
  return out.map((g) => ({ ...g, marks: g.items.reduce((s, x) => s + x.q.points, 0) }));
}

export const SectionHead = ({ g }) => (g.title ? <div className="sec-head"><span className="grow">{g.title}</span><span className="small">{g.marks} marks</span></div> : null);
export const CodeBlock = ({ code }) => (code ? <pre className="code-block">{code}</pre> : null);
export const marksLabel = (n) => `${n} mark${n === 1 ? '' : 's'}`;
