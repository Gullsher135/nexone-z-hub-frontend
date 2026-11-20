import { Component } from 'react';

// If one screen crashes, the person sees a clear message and a reload button instead of a blank page.
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('Screen crashed', error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ maxWidth: 440, margin: '15vh auto', padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 22 }}>Something went wrong</h1>
        <p style={{ color: '#555', lineHeight: 1.6 }}>The page could not be shown. Your data is safe. Reload the page, and if it happens again tell the admin what you were doing.</p>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 18px', fontSize: 16, borderRadius: 8, border: 0, background: '#2f22c8', color: '#fff', cursor: 'pointer' }}>Reload</button>
      </div>
    );
  }
}
