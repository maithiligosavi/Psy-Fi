import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import Auth from './Auth';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * AdminRoute — wraps any route that requires admin access.
 *
 * While auth is loading → shows the same spinner used in App.tsx.
 * If the user is not authenticated or not an admin → renders <Auth />.
 * If the user is an admin → renders children.
 */
export default function AdminRoute({ children }: AdminRouteProps) {
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
            Verifying access…
          </div>
        </div>
      </div>
    );
  }

  // Not logged in, or not an admin → fall back to the Auth screen.
  if (!user || role !== 'admin') {
    return <Auth />;
  }

  return <>{children}</>;
}
