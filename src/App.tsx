import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { useAuth } from './hooks/useAuth';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ChangesPage from './components/ChangesPage';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './components/AdminDashboard';
import ChangelogPage from './components/ChangelogPage';

/** Loading splash — shared by all route guards */
function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--aliceBlue)' }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl animate-pulse"
          style={{ background: 'var(--stormyTeal)' }}
        >
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <div className="text-lg font-bold" style={{ color: 'var(--stormyTeal)' }}>
          Loading Psy-Fi…
        </div>
        <div className="text-sm" style={{ color: 'var(--pearlAqua)' }}>
          Preparing your mindful finance dashboard
        </div>
      </div>
    </div>
  );
}

/** Guard: redirects unauthenticated users to /auth */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
}

/** Guard: redirects already-authenticated users away from /auth */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return !user ? <>{children}</> : <Navigate to="/" replace />;
}

/** Root redirect: sends admins to /admin, regular users to Dashboard */
function RootRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <Dashboard />;
}

/** Guard: redirects non-admins back to /auth */
function AdminGuardRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user || role !== 'admin') return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public: login / sign-up */}
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        }
      />

      {/* Admin: protected admin console */}
      <Route
        path="/admin"
        element={
          <AdminGuardRoute>
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          </AdminGuardRoute>
        }
      />

      {/* Admin: changelog / release notes (admin only) */}
      <Route
        path="/changelog"
        element={
          <AdminGuardRoute>
            <AdminRoute>
              <ChangelogPage />
            </AdminRoute>
          </AdminGuardRoute>
        }
      />

      {/* Root: auto-redirects admins → /admin, users → Dashboard */}
      <Route path="/" element={<RootRedirect />} />

      {/* Private: custom-entry audit log (all users) */}
      <Route
        path="/changes"
        element={
          <PrivateRoute>
            <ChangesPage />
          </PrivateRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
