import { useEffect, useState } from 'react';

// Shown only when the server takes more than a few seconds to answer.
export default function SlowBanner() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const on = (e) => setSlow(!!e.detail);
    window.addEventListener('nz-slow', on);
    return () => window.removeEventListener('nz-slow', on);
  }, []);
  if (!slow) return null;
  return (
    <div role="status" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: '#fff7e0', color: '#5c4400', borderBottom: '1px solid #f0d58a', padding: '10px 16px', textAlign: 'center', fontSize: 14 }}>
      The server is waking up. The first page after a quiet time can take up to a minute. Please wait, it will load by itself.
    </div>
  );
}
