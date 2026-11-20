import { useRef, useState } from 'react';
import { api, downloadFile, uploadProjectDoc } from '../../../lib/api.js';
import { useAsync } from '../../../lib/useAsync.js';
import { useToast } from '../../../lib/toast.jsx';
import { Empty, Field, Loading, Modal } from '../../../components.jsx';
import { DOC_CATEGORIES, extOf, fileSize, when } from '../shared.jsx';

// Project documents: requirements, designs, contracts, reports. Everybody on the project can add and download.
export default function Documents({ project, canManage, me }) {
  const toast = useToast();
  const state = useAsync(() => api.get(`/flow/projects/${project._id}/documents`), [project._id]);
  const input = useRef(null);
  const [f, setF] = useState({ title: '', category: 'requirements', note: '' });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [filter, setFilter] = useState('');
  const [edit, setEdit] = useState(null);
  const items = (state.data?.items || []).filter((d) => !filter || d.category === filter);
  const maxMb = state.data?.maxMb || 10;

  const pick = (list) => setFiles(Array.from(list || []));
  async function upload(e) {
    e.preventDefault();
    if (!files.length) return toast('Choose a file first', 'bad');
    setBusy(true);
    let ok = 0;
    for (const file of files) {
      try {
        await uploadProjectDoc(file, project._id, { title: files.length === 1 ? f.title : '', category: f.category, note: f.note });
        ok += 1;
      } catch (err) { toast(err.message, 'bad'); }
    }
    setBusy(false);
    if (ok) { toast(ok === 1 ? 'Document uploaded' : `${ok} documents uploaded`); setFiles([]); setF({ ...f, title: '', note: '' }); if (input.current) input.current.value = ''; state.reload(); }
  }
  async function remove(d) {
    if (!window.confirm(`Delete "${d.title}"? This cannot be undone.`)) return;
    try { await api.del(`/flow/documents/${d._id}`); state.reload(); } catch (err) { toast(err.message, 'bad'); }
  }
  async function download(d) {
    try { await downloadFile(`/flow/documents/${d._id}/download`, d.name || d.title); } catch (err) { toast(err.message, 'bad'); }
  }
  async function saveEdit(e) {
    e.preventDefault();
    try { await api.patch(`/flow/documents/${edit._id}`, { title: edit.title, category: edit.category, note: edit.note }); setEdit(null); state.reload(); } catch (err) { toast(err.message, 'bad'); }
  }

  return (
    <div className="stack">
      <form className="panel panel-pad stack" onSubmit={upload}>
        <h2 style={{ margin: 0 }}>Add documents</h2>
        <div
          className={`dropzone${over ? ' over' : ''}`} role="button" tabIndex={0}
          onClick={() => input.current?.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
        >
          {files.length ? <b>{files.map((x) => `${x.name} (${fileSize(x.size)})`).join(', ')}</b> : <>Drop files here or tap to choose. Any format, up to {maxMb} MB each.</>}
          <input ref={input} type="file" multiple hidden onChange={(e) => pick(e.target.files)} />
        </div>
        <div className="grid2">
          {files.length <= 1 && <Field label="Title" hint="Leave empty to use the file name."><input type="text" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={140} /></Field>}
          <Field label="Category"><select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{Object.entries(DOC_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        </div>
        <Field label="Note (optional)" hint="For example the version or what changed."><input type="text" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={500} /></Field>
        <div className="row"><span className="muted small grow">{state.data?.storage === 'bucket' ? 'Stored in free object storage.' : 'Stored in the database. Connect free object storage (S3 settings) for more space.'}</span><button className="btn primary" disabled={busy || !files.length}>{busy ? 'Uploading...' : `Upload${files.length > 1 ? ` ${files.length} files` : ''}`}</button></div>
      </form>

      <div className="panel">
        <div className="panel-head"><h2>Documents</h2><select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Category filter" style={{ width: 'auto' }}><option value="">All categories</option>{Object.entries(DOC_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <Loading state={state}>
          {state.data && (items.length === 0 ? <Empty title="No documents yet">Upload requirements, designs, contracts and reports so the whole team finds them in one place.</Empty> : items.map((d) => (
            <div className="list-row" key={d._id}>
              <span className="ext-badge" aria-hidden="true">{extOf(d.name)}</span>
              <div className="grow">
                <b>{d.title}</b> <span className="chip muted">{DOC_CATEGORIES[d.category] || 'Other'}</span>
                <div className="muted small">{d.name} · {fileSize(d.size)} · {d.uploadedBy?.name || 'Someone'} · {when(d.createdAt)}</div>
                {d.note && <div className="small">{d.note}</div>}
              </div>
              <button className="btn sm" onClick={() => download(d)}>Download</button>
              {(canManage || d.uploadedBy?._id === me) && <button className="btn sm ghost" onClick={() => setEdit({ ...d })}>Edit</button>}
              {(canManage || d.uploadedBy?._id === me) && <button className="btn sm ghost" onClick={() => remove(d)} aria-label={`Delete ${d.title}`}>Delete</button>}
            </div>
          )))}
        </Loading>
        {state.data && state.data.items.length > 0 && <div className="panel-pad muted small">{state.data.items.length} documents · {fileSize(state.data.totalBytes)}</div>}
      </div>

      {edit && (
        <Modal title="Edit document" onClose={() => setEdit(null)} footer={<><button className="btn" onClick={() => setEdit(null)}>Cancel</button><button className="btn primary" form="doc-edit">Save</button></>}>
          <form id="doc-edit" className="stack" onSubmit={saveEdit}>
            <Field label="Title"><input type="text" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} required maxLength={140} autoFocus /></Field>
            <Field label="Category"><select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{Object.entries(DOC_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Note"><input type="text" value={edit.note || ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })} maxLength={500} /></Field>
          </form>
        </Modal>
      )}
    </div>
  );
}
