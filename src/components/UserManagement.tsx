import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, Profile } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Brain, Users, LogOut, ShieldCheck, UserCog, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--stormyTeal), var(--pearlAqua))' }}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h2 className="text-lg font-extrabold" style={{ color: 'var(--stormyTeal)' }}>{title}</h2>
        {subtitle && <p className="text-xs" style={{ color: 'var(--pearlAqua)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { profile, signOut } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setError('');
      const profilesSnap = await getDocs(
        query(collection(db, 'profiles'), orderBy('created_at', 'desc'))
      );
      const allProfiles = profilesSnap.docs.map((d) => ({
        id: d.id,
        name: d.data().name ?? '',
        email: d.data().email ?? '',
        role: d.data().role ?? 'user',
        created_at: d.data().created_at ?? '',
      })) as Profile[];
      setUsers(allProfiles);
    } catch (err) {
      console.error('User load error:', err);
      setError('Failed to load users. Verify Firestore security rules are deployed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSignOut = async () => {
    try { await signOut(); } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--aliceBlue)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl animate-pulse" style={{ background: 'var(--stormyTeal)' }}>
            <UserCog className="w-8 h-8 text-white" />
          </div>
          <div className="text-lg font-bold" style={{ color: 'var(--stormyTeal)' }}>Loading Users…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--aliceBlue)' }}>
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl" style={{ background: 'var(--stormyTeal)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl" style={{ background: 'var(--pearlAqua)', transform: 'translate(-30%, 30%)' }} />
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-10 shadow-sm border-b" style={{ background: 'rgba(0,109,119,0.92)', backdropFilter: 'blur(16px)', borderColor: 'rgba(131,197,190,0.3)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'rgba(131,197,190,0.25)', border: '1px solid rgba(131,197,190,0.4)' }}>
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-white tracking-tight">Psy-Fi</h1>
                  <p className="text-xs font-medium" style={{ color: 'var(--almondSilk)' }}>User Management</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 border-l pl-6" style={{ borderColor: 'rgba(131,197,190,0.3)' }}>
                <Link to="/admin" className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all text-white/70 hover:text-white hover:bg-white/10">
                  Metrics
                </Link>
                <Link to="/admin/users" className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all bg-white/20 text-white">
                  User Management
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(226,149,120,0.2)', border: '1px solid rgba(226,149,120,0.4)' }}>
                <ShieldCheck className="w-4 h-4" style={{ color: 'var(--almondSilk)' }} />
                <span className="text-xs font-bold" style={{ color: 'var(--almondSilk)' }}>{profile?.name || 'Admin'}</span>
              </div>
              <button onClick={handleRefresh} disabled={refreshing} title="Refresh data" className="p-2 rounded-xl transition-all hover:scale-105 disabled:opacity-50" style={{ background: 'rgba(131,197,190,0.2)', border: '1px solid rgba(131,197,190,0.3)' }}>
                <RefreshCw className={`w-4 h-4 text-white ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={handleSignOut} title="Sign Out" className="p-2 rounded-xl transition-all hover:scale-105" style={{ background: 'rgba(226,149,120,0.2)', border: '1px solid rgba(226,149,120,0.4)' }}>
                <LogOut className="w-5 h-5" style={{ color: 'var(--almondSilk)' }} />
              </button>
            </div>
          </div>
          {/* Mobile Nav */}
          <div className="sm:hidden flex items-center gap-2 pb-3 pt-1 border-t border-white/10 mt-1">
             <Link to="/admin" className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all text-white/70 hover:text-white hover:bg-white/10 w-full text-center">
               Metrics
             </Link>
             <Link to="/admin/users" className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all bg-white/20 text-white w-full text-center">
               Users
             </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div className="p-4 rounded-xl border text-sm font-medium" style={{ background: '#fff0ed', borderColor: 'var(--tangerineDream)', color: '#c0392b' }}>
            ⚠️ {error}
          </div>
        )}

        <section>
          <SectionHeader icon={UserCog} title="User Management" subtitle={`${users.length} registered account${users.length !== 1 ? 's' : ''}`} />
          <div className="rounded-2xl shadow-md border overflow-hidden" style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}>
            <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-bold uppercase tracking-wide border-b" style={{ background: 'linear-gradient(135deg, var(--stormyTeal), #004d57)', color: 'var(--almondSilk)', borderColor: 'rgba(131,197,190,0.2)' }}>
              <span className="col-span-4">Name</span>
              <span className="col-span-6">Email</span>
              <span className="col-span-2 text-center">Role</span>
            </div>

            {users.length === 0 ? (
              <div className="py-10 text-center">
                <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--pearlAqua)' }} />
                <p className="text-sm" style={{ color: 'var(--pearlAqua)' }}>No users found.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(131,197,190,0.15)' }}>
                {users.map((u, idx) => (
                  <div key={u.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center transition-colors hover:bg-slate-50" style={{ animationDelay: `${idx * 30}ms` }}>
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white" style={{ background: u.role === 'admin' ? 'var(--tangerineDream)' : 'var(--stormyTeal)' }}>
                        {(u.name?.[0] ?? '?').toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--stormyTeal)' }}>{u.name || '—'}</span>
                    </div>
                    <div className="col-span-6 min-w-0">
                      <span className="text-sm truncate block" style={{ color: 'var(--pearlAqua)' }}>{u.email}</span>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full capitalize" style={
                          u.role === 'admin'
                            ? { background: 'rgba(226,149,120,0.15)', color: 'var(--tangerineDream)', border: '1px solid rgba(226,149,120,0.4)' }
                            : { background: 'rgba(0,109,119,0.08)', color: 'var(--stormyTeal)', border: '1px solid rgba(131,197,190,0.4)' }
                        }>
                        {u.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
