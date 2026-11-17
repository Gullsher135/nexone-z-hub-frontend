import { useRef, useState } from 'react';
import { downloadFile, uploadFile, MAX_UPLOAD_MB } from './api.js';
import { useToast } from './toast.jsx';

export const fmtSize = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);

// Read-only list: each file downloads when clicked.
export function FileList({ files = [] }) {
  const toast = useToast();
  if (!files.length) return null;
  return (
    <div className="file-list">
      {files.map((f) => (
        <button type="button" className="file-chip" key={String(f.file)} title="Download"
          onClick={() => downloadFile(`/lms/files/${f.file}`, f.name).catch((e) => toast(e.message, 'bad'))}>
          <span className="file-name">{f.name}</span><span className="muted small">{fmtSize(f.size)}</span>
        </button>
      ))}
    </div>
  );
}

// Choose files (any format), upload them, and keep the list. files = [{ file, name, size }]
export function FilePicker({ course, kind, files, onChange, max = 5 }) {
  const toast = useToast();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  async function pick(e) {
    const chosen = [...e.target.files];
    e.target.value = '';
    if (!chosen.length) return;
    if (files.length + chosen.length > max) return toast(`You can attach up to ${max} files`, 'bad');
    setBusy(true);
    let next = files;
    for (const f of chosen) {
      try { next = [...next, await uploadFile(f, { course, kind })]; onChange(next); } catch (err) { toast(err.message, 'bad'); }
    }
    setBusy(false);
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      {files.map((f) => (
        <div className="file-chip static" key={String(f.file)}>
          <span className="file-name">{f.name}</span><span className="muted small">{fmtSize(f.size)}</span>
          <button type="button" className="btn sm ghost" onClick={() => onChange(files.filter((x) => String(x.file) !== String(f.file)))}>Remove</button>
        </div>
      ))}
      <div>
        <input ref={input} type="file" multiple hidden onChange={pick} />
        <button type="button" className="btn" disabled={busy || files.length >= max} onClick={() => input.current?.click()}>{busy ? 'Uploading...' : files.length ? 'Add another file' : 'Choose file'}</button>
        <span className="muted small" style={{ marginLeft: 10 }}>PDF, Word, code, zip, images, any format. Up to {max} files, {MAX_UPLOAD_MB} MB each.</span>
      </div>
    </div>
  );
}
