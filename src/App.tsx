import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { useAuth } from './hooks/useAuth';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
<<<<<<< HEAD
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './components/AdminDashboard';

function AppContent() {
  const { user, role, loading } = useAuth();

  if (loading) {
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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

  // Not authenticated → show login / sign-up screen.
  if (!user) return <Auth />;

  // Admin user → protected admin dashboard.
  if (role === 'admin') {
    return (
      <AdminRoute>
        <AdminDashboard />
      </AdminRoute>
    );
  }

  // Regular authenticated user → standard dashboard.
  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
=======
import ChangesPage from './components/ChangesPage';

/** Loading splash */
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
>>>>>>> fed669b96068ebc6287cb63b3a361b705af7dc1d
  );
}

/** Guard: redirects unauthenticated users to /auth */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
}

/** Guard: redirects already-authenticated users to / */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return !user ? <>{children}</> : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
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
