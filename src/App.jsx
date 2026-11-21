import { Suspense, lazy } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { Spinner, TableLabels } from './components.jsx';
import SlowBanner from './SlowBanner.jsx';
import Login from './pages/Login.jsx';
import StaffLayout from './layouts/StaffLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import FlowLayout from './layouts/FlowLayout.jsx';
import PayLayout from './layouts/PayLayout.jsx';
import { Receipt, PayslipDoc, LetterDoc } from './pages/Print.jsx';
import CrewLayout from './layouts/CrewLayout.jsx';
import AdminCrewLayout from './layouts/AdminCrewLayout.jsx';
import LearnAdminLayout from './layouts/LearnAdminLayout.jsx';
import StudentLayout from './layouts/StudentLayout.jsx';

// Each screen is loaded only when it is opened, so the first visit downloads far less.
const Scan = lazy(() => import('./pages/Scan.jsx'));
const OfficeSync = lazy(() => import('./pages/OfficeSync.jsx'));
const Today = lazy(() => import('./pages/staff/Today.jsx'));
const History = lazy(() => import('./pages/staff/History.jsx'));
const MyLeaves = lazy(() => import('./pages/staff/Leaves.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const Board = lazy(() => import('./pages/admin/Board.jsx'));
const People = lazy(() => import('./pages/admin/People.jsx'));
const Batches = lazy(() => import('./pages/admin/Batches.jsx'));
const ClassAttendance = lazy(() => import('./pages/admin/ClassAttendance.jsx'));
const AdminLeaves = lazy(() => import('./pages/admin/Leaves.jsx'));
const Reports = lazy(() => import('./pages/admin/Reports.jsx'));
const Qr = lazy(() => import('./pages/admin/Qr.jsx'));
const Settings = lazy(() => import('./pages/admin/Settings.jsx'));
const Hub = lazy(() => import('./pages/Hub.jsx'));
const FlowHome = lazy(() => import('./pages/flow/FlowHome.jsx'));
const TimeReport = lazy(() => import('./pages/flow/TimeReport.jsx'));
const Projects = lazy(() => import('./pages/flow/Projects.jsx'));
const ProjectBoard = lazy(() => import('./pages/flow/Board.jsx'));
const Clients = lazy(() => import('./pages/flow/Clients.jsx'));
const MyWork = lazy(() => import('./pages/flow/MyWork.jsx'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog.jsx'));
const PayHome = lazy(() => import('./pages/pay/PayHome.jsx'));
const Fees = lazy(() => import('./pages/pay/Fees.jsx'));
const Payroll = lazy(() => import('./pages/pay/Payroll.jsx'));
const Salaries = lazy(() => import('./pages/pay/Salaries.jsx'));
const MyFees = lazy(() => import('./pages/learn/MyFees.jsx'));
const Payslips = lazy(() => import('./pages/crew/Payslips.jsx'));
const AdminLetters = lazy(() => import('./pages/crew/AdminLetters.jsx'));
const MyLetters = lazy(() => import('./pages/crew/MyLetters.jsx'));
const CrewHome = lazy(() => import('./pages/crew/CrewHome.jsx'));
const MyTasks = lazy(() => import('./pages/crew/MyTasks.jsx'));
const Notices = lazy(() => import('./pages/crew/Notices.jsx'));
const Team = lazy(() => import('./pages/crew/Team.jsx'));
const Profile = lazy(() => import('./pages/crew/Profile.jsx'));
const AdminNotices = lazy(() => import('./pages/crew/AdminNotices.jsx'));
const NotificationHealth = lazy(() => import('./pages/crew/NotificationHealth.jsx'));
const AdminTasks = lazy(() => import('./pages/crew/AdminTasks.jsx'));
const AdminPolicy = lazy(() => import('./pages/crew/AdminPolicy.jsx'));
const Verify = lazy(() => import('./pages/Verify.jsx'));
const LearnAdminHome = lazy(() => import('./pages/learn/LearnAdminHome.jsx'));
const CourseManage = lazy(() => import('./pages/learn/CourseManage.jsx'));
const Teachers = lazy(() => import('./pages/learn/Teachers.jsx'));
const ShareProject = lazy(() => import('./pages/ShareProject.jsx'));
const StudentHome = lazy(() => import('./pages/learn/StudentHome.jsx'));
const MyCourses = lazy(() => import('./pages/learn/MyCourses.jsx'));
const CoursePlayer = lazy(() => import('./pages/learn/CoursePlayer.jsx'));
const Certificates = lazy(() => import('./pages/learn/Certificates.jsx'));
const Competitions = lazy(() => import('./pages/learn/Competitions.jsx'));
const CompetitionDetail = lazy(() => import('./pages/learn/Competitions.jsx').then((m) => ({ default: m.CompetitionDetail })));
const MyCompetitions = lazy(() => import('./pages/learn/MyCompetitions.jsx'));

function Protected({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  const isAdmin = user.role === 'admin';
  const isStudent = user.role === 'student';
  if (role === 'student') return isStudent ? <Outlet /> : <Navigate to={isAdmin ? '/hub' : '/'} replace />;
  if (isStudent) return <Navigate to="/learn" replace />;
  // The teacher portal is open to teacher-only logins and to employees/interns with teacher access.
  if (role === 'teach') return isAdmin ? <Navigate to="/hub" replace /> : <Outlet />;
  // A teacher-only login never sees the employee or admin pages.
  if (user.role === 'teacher') return <Navigate to="/teach" replace />;
  if (role === 'admin' && !isAdmin) return <Navigate to="/" replace />;
  if (role === 'staff' && isAdmin) return <Navigate to="/hub" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <>
    <TableLabels />
    <SlowBanner />
    <Suspense fallback={<Spinner />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/office-sync/:key" element={<OfficeSync />} />
      <Route path="/verify" element={<Verify />} />
      <Route element={<Protected />}>
        <Route path="/print/receipt/:id" element={<Receipt />} />
        <Route path="/print/payslip/:id" element={<PayslipDoc />} />
        <Route path="/print/letter/:id" element={<LetterDoc />} />
      </Route>
      <Route path="/verify/:code" element={<Verify />} />
      <Route path="/share/:token" element={<ShareProject />} />

      <Route element={<Protected role="student" />}>
        <Route path="/learn" element={<StudentLayout />}>
          <Route index element={<StudentHome />} />
          <Route path="courses" element={<MyCourses />} />
          <Route path="course/:id" element={<CoursePlayer />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="competitions" element={<MyCompetitions />} />
          <Route path="fees" element={<MyFees />} />
          <Route path="notices" element={<Notices />} />
          <Route path="account" element={<Account />} />
        </Route>
      </Route>

      <Route element={<Protected role="teach" />}>
        <Route path="/teach" element={<LearnAdminLayout teach />}>
          <Route index element={<LearnAdminHome teach />} />
          <Route path="attendance" element={<ClassAttendance teach />} />
          <Route path="competitions" element={<Competitions teach />} />
          <Route path="competitions/:id" element={<CompetitionDetail teach />} />
          <Route path="notices" element={<Notices />} />
          <Route path="account" element={<Account />} />
          <Route path=":id" element={<CourseManage teach />} />
        </Route>
      </Route>

      <Route element={<Protected role="staff" />}>
        <Route path="/scan" element={<Scan />} />
        <Route element={<CrewLayout />}>
          <Route index element={<CrewHome />} />
          <Route path="tasks" element={<MyTasks />} />
          <Route path="notices" element={<Notices />} />
          <Route path="team" element={<Team />} />
          <Route path="payslips" element={<Payslips />} />
          <Route path="letters" element={<MyLetters />} />
          <Route path="profile" element={<Profile />} />
          <Route path="account" element={<Account />} />
        </Route>
        <Route path="/flow" element={<FlowLayout />}>
          <Route index element={<MyWork />} />
          <Route path="projects" element={<Projects kind="project" />} />
          <Route path="projects/:id" element={<ProjectBoard />} />
          <Route path="products" element={<Projects kind="product" />} />
          <Route path="products/:id" element={<ProjectBoard />} />
          <Route path="reports" element={<TimeReport />} />
          <Route path="saas" element={<Projects kind="saas" />} />
          <Route path="saas/:id" element={<ProjectBoard />} />
          <Route path="account" element={<Account />} />
        </Route>
        <Route path="/time" element={<StaffLayout />}>
          <Route index element={<Today />} />
          <Route path="history" element={<History />} />
          <Route path="leaves" element={<MyLeaves />} />
        </Route>
      </Route>

      <Route element={<Protected role="admin" />}>
        <Route path="/hub" element={<Hub />} />
        <Route path="/admin/flow" element={<FlowLayout />}>
          <Route index element={<FlowHome />} />
          <Route path="projects" element={<Projects kind="project" />} />
          <Route path="projects/:id" element={<ProjectBoard />} />
          <Route path="products" element={<Projects kind="product" />} />
          <Route path="products/:id" element={<ProjectBoard />} />
          <Route path="saas" element={<Projects kind="saas" />} />
          <Route path="saas/:id" element={<ProjectBoard />} />
          <Route path="clients" element={<Clients />} />
        </Route>
        <Route path="/admin/pay" element={<PayLayout />}>
          <Route index element={<PayHome />} />
          <Route path="fees" element={<Fees />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="salaries" element={<Salaries />} />
        </Route>
        <Route path="/admin/crew" element={<AdminCrewLayout />}>
          <Route index element={<AdminNotices />} />
          <Route path="notifications" element={<NotificationHealth />} />
          <Route path="tasks" element={<AdminTasks />} />
          <Route path="policy" element={<AdminPolicy />} />
          <Route path="letters" element={<AdminLetters />} />
        </Route>
        <Route path="/admin/learn" element={<LearnAdminLayout />}>
          <Route index element={<LearnAdminHome />} />
          <Route path="competitions" element={<Competitions />} />
          <Route path="competitions/:id" element={<CompetitionDetail />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path=":id" element={<CourseManage />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="today" element={<Board />} />
          <Route path="people" element={<People />} />
          <Route path="batches" element={<Batches />} />
          <Route path="classes" element={<ClassAttendance />} />
          <Route path="leaves" element={<AdminLeaves />} />
          <Route path="reports" element={<Reports />} />
          <Route path="qr" element={<Qr />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="settings" element={<Settings />} />
          <Route path="account" element={<Account />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </>
  );
}
