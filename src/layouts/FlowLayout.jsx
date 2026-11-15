import Shell from './Shell.jsx';
import { Icon } from '../components.jsx';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { useAsync } from '../lib/useAsync.js';

// NexoneZ Flow. The admin gets Overview, Projects and Clients; staff get their own work and the projects they are in.
export default function FlowLayout() {
  const { user } = useAuth();
  const admin = user.role === 'admin';
  const teaching = useAsync(() => (admin ? Promise.resolve({ courses: 0 }) : api.get('/lms/overview').catch(() => ({ courses: 0 }))), []);
  // overdue + due-today cards: the admin sees all of them, everyone else sees their own
  const due = useAsync(() => (admin ? api.get('/flow/overview').then((o) => ({ n: o.overdueCards })) : api.get('/flow/reminders').then((r) => ({ n: r.overdue + r.dueToday }))).catch(() => ({ n: 0 })), []);
  const badge = due.data?.n || 0;
  const badgeTitle = admin ? `${badge} overdue cards` : `${badge} cards overdue or due today`;
  const items = admin
    ? [
        { to: '/hub', label: 'Hub home', icon: Icon.home, end: true },
        { sep: true },
        { to: '/admin/flow', label: 'Overview', icon: Icon.chart, end: true, badge, badgeTitle },
        { to: '/admin/flow/projects', label: 'Projects', icon: Icon.book },
        { to: '/admin/flow/clients', label: 'Clients', icon: Icon.people },
      ]
    : [
        { to: '/', label: 'My home', icon: Icon.home, end: true },
        { sep: true },
        { to: '/flow', label: 'My work', icon: Icon.check, end: true, badge, badgeTitle },
        { to: '/flow/projects', label: 'Projects', icon: Icon.book },
      ];
  const links = admin
    ? { time: '/admin', learn: '/admin/learn', crew: '/admin/crew', pay: '/admin/pay', flow: '/admin/flow' }
    : { time: '/time', crew: '/', flow: '/flow', ...(user.isTeacher || teaching.data?.courses > 0 ? { learn: '/teach' } : {}) };
  return <Shell module="flow" items={items} links={links} accountPath={admin ? '/admin/account' : '/account'} rootPath="flow" />;
}
