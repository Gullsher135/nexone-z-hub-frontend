import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { KINDS, KindChip } from './shared.jsx';

// One search box for projects, products, SaaS, cards and documents you are allowed to see.
export default function FlowSearch({ base }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [r, setR] = useState(null);
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) { setR(null); return undefined; }
    let live = true;
    const t = setTimeout(() => api.get(`/flow/search?q=${encodeURIComponent(q.trim())}`).then((x) => live && setR(x)).catch(() => {}), 250);
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  useEffect(() => {
    const away = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const go = (to) => { setOpen(false); setQ(''); nav(to); };
  const empty = r && !r.projects.length && !r.cards.length && !r.docs.length;
  return (
    <div className="fsearch" ref={box}>
      <input type="search" value={q} placeholder="Search projects, cards and documents" aria-label="Search Flow" onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      {open && r && (
        <div className="fsearch-panel" role="listbox">
          {empty && <div className="muted small" style={{ padding: 12 }}>Nothing found.</div>}
          {r.projects.length > 0 && <div className="fsearch-h">Projects, products and SaaS</div>}
          {r.projects.map((p) => <button type="button" key={p._id} className="fsearch-i" onClick={() => go(`${base}/${KINDS[p.kind].path}/${p._id}`)}><b>{p.name}</b> <KindChip kind={p.kind} /> <span className="muted small">{p.code}</span></button>)}
          {r.cards.length > 0 && <div className="fsearch-h">Cards</div>}
          {r.cards.map((c) => <button type="button" key={c._id} className="fsearch-i" onClick={() => go(`${base}/projects/${c.project._id}?item=${c._id}`)}><b>{c.title}</b> <span className="muted small">in {c.project.name}</span></button>)}
          {r.docs.length > 0 && <div className="fsearch-h">Documents</div>}
          {r.docs.map((d) => <button type="button" key={d._id} className="fsearch-i" onClick={() => go(`${base}/projects/${d.project._id}?tab=documents`)}><b>{d.title}</b> <span className="muted small">in {d.project.name}</span></button>)}
        </div>
      )}
    </div>
  );
}
