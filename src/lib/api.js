const BASE = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')}/api`;

export const TOKEN_KEY = 'nz_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

// Free hosting puts the server to sleep when nobody uses it, and the first request wakes it (up to a minute).
// When a request takes longer than a few seconds the screen shows a message, so nobody thinks the site is broken.
let pending = 0;
let slowTimer = null;
const slow = (on) => window.dispatchEvent(new CustomEvent('nz-slow', { detail: on }));
const begin = () => { pending += 1; if (pending === 1) slowTimer = setTimeout(() => slow(true), 4000); };
const end = () => { pending = Math.max(0, pending - 1); if (pending === 0) { clearTimeout(slowTimer); slow(false); } };

async function request(method, path, body, { raw = false } = {}) {
  let res;
  begin();
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check your internet connection and try again.');
  } finally {
    end();
  }

  if (raw && res.ok) return res;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    if (res.status === 401 && getToken()) window.dispatchEvent(new Event('nz-unauthorized'));
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b || {}),
  put: (p, b) => request('PUT', p, b || {}),
  patch: (p, b) => request('PATCH', p, b || {}),
  del: (p) => request('DELETE', p),
};

export async function downloadFile(path, filename) {
  const res = await request('GET', path, null, { raw: true });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Sends one file as raw bytes (any format, up to 10 MB). Returns { file, name, size, mime }.
export const MAX_UPLOAD_MB = 10;
export async function uploadFile(file, { course, kind }) {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`${file.name} is larger than ${MAX_UPLOAD_MB} MB`);
  if (file.size === 0) throw new Error(`${file.name} is empty`);
  let res;
  try {
    res = await fetch(`${BASE}/lms/files${qs({ course, kind, name: file.name, type: file.type })}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: file,
    });
  } catch {
    throw new Error('Cannot reach the server. Check your internet connection and try again.');
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new Error(data?.message || `Upload failed (${res.status})`);
  return data.file;
}

// Uploads one project document (NexoneZ Flow). Returns the saved document.
export async function uploadProjectDoc(file, projectId, { title, category, note, item } = {}) {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`${file.name} is larger than ${MAX_UPLOAD_MB} MB`);
  if (file.size === 0) throw new Error(`${file.name} is empty`);
  let res;
  try {
    res = await fetch(`${BASE}/flow/projects/${projectId}/documents${qs({ name: file.name, type: file.type, title, category, note, item })}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: file,
    });
  } catch {
    throw new Error('Cannot reach the server. Check your internet connection and try again.');
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new Error(data?.message || `Upload failed (${res.status})`);
  return data.doc;
}

export const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};
