import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import { Login, Register } from './pages/Auth';
import { JobList, MySubmissions } from './pages/CandidatePortal';
import Assessment from './pages/Assessment';
import RecruiterDashboard from './pages/RecruiterDashboard';
import PostJob from './pages/PostJob';

function PrivateRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={user ? <Navigate to={user.role === 'candidate' ? '/jobs' : '/recruiter'} /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={user.role === 'candidate' ? '/jobs' : '/recruiter'} /> : <Register />} />

        {/* Candidate routes */}
        <Route path="/jobs" element={<PrivateRoute roles={['candidate']}><JobList /></PrivateRoute>} />
        <Route path="/apply/:jobId" element={<PrivateRoute roles={['candidate']}><Assessment /></PrivateRoute>} />
        <Route path="/my-submissions" element={<PrivateRoute roles={['candidate']}><MySubmissions /></PrivateRoute>} />

        {/* Recruiter routes */}
        <Route path="/recruiter" element={<PrivateRoute roles={['recruiter', 'admin']}><RecruiterDashboard /></PrivateRoute>} />
        <Route path="/post-job" element={<PrivateRoute roles={['recruiter', 'admin']}><PostJob /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
