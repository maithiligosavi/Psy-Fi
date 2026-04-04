import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, Profile, AuditEntry } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import {
  Brain, Users, Receipt, TrendingUp, Smile, Meh, Frown,
  TrendingDown, LogOut, ShieldCheck, BarChart3, UserCog,
  RefreshCw, Ban,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CategoryStat {
  name: string;
  count: number;
  total: number;
}

interface MoodStat {
  mood: string;
  count: number;
  color: string;
  icon: React.ElementType;
}

// ── Mood config ────────────────────────────────────────────────────────────────

const MOOD_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  Happy:   { color: '#10b981', icon: Smile },
  Neutral: { color: '#f59e0b', icon: Meh },
  Sad:     { color: '#60a5fa', icon: Frown },
  Stressed:{ color: '#ef4444', icon: TrendingDown },
  Excited: { color: '#a855f7', icon: TrendingUp },
  Bored:   { color: '#94a3b8', icon: Meh },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 shadow-md border flex items-start gap-4"
      style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
        style={{
          background: accent
            ? `linear-gradient(135deg, ${accent}, ${accent}99)`
            : 'linear-gradient(135deg, var(--stormyTeal), var(--pearlAqua))',
        }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--pearlAqua)' }}>
          {label}
        </p>
        <p className="text-3xl font-extrabold mt-0.5" style={{ color: 'var(--stormyTeal)' }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-1" style={{ color: 'var(--pearlAqua)' }}>{sub}</p>
        )}
      </div>
    </div>
  );
}

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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();

  const [users, setUsers] = useState<Profile[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [moodStats, setMoodStats] = useState<MoodStat[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setError('');

      // ── 1. Fetch all profiles ──────────────────────────────────────────────
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

      // ── 2. Fetch all audit entries for aggregated analytics ──────────────
      const entriesSnap = await getDocs(collection(db, 'audit_entries'));
      const entries = entriesSnap.docs.map((d) => d.data() as Omit<AuditEntry, 'id'>);
      setTotalTransactions(entries.length);

      // ── Category aggregation ─────────────────────────────────────────────
      const catMap: Record<string, { count: number; total: number }> = {};
      for (const e of entries) {
        const cat = e.spending_category || 'Uncategorised';
        if (!catMap[cat]) catMap[cat] = { count: 0, total: 0 };
        catMap[cat].count += 1;
        catMap[cat].total += Number(e.amount) || 0;
      }
      const sortedCats: CategoryStat[] = Object.entries(catMap)
        .map(([name, s]) => ({ name, ...s }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setCategoryStats(sortedCats);

      // ── Mood aggregation ──────────────────────────────────────────────────
      const moodMap: Record<string, number> = {};
      for (const e of entries) {
        const m = e.mood || 'Neutral';
        moodMap[m] = (moodMap[m] ?? 0) + 1;
      }
      const moodList: MoodStat[] = Object.entries(moodMap)
        .map(([mood, count]) => ({
          mood,
          count,
          color: MOOD_CONFIG[mood]?.color ?? '#94a3b8',
          icon: MOOD_CONFIG[mood]?.icon ?? Meh,
        }))
        .sort((a, b) => b.count - a.count);
      setMoodStats(moodList);

    } catch (err) {
      console.error('Admin data load error:', err);
      setError('Failed to load admin data. Verify Firestore security rules are deployed.');
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

  // ── Loading state ──────────────────────────────────────────────────────────
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
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div className="text-lg font-bold" style={{ color: 'var(--stormyTeal)' }}>
            Loading Admin Console…
          </div>
        </div>
      </div>
    );
  }

  const maxCatCount = categoryStats[0]?.count ?? 1;
  const totalMoodCount = moodStats.reduce((s, m) => s + m.count, 0) || 1;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--aliceBlue)' }}>

      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--stormyTeal)', transform: 'translate(30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--pearlAqua)', transform: 'translate(-30%, 30%)' }}
        />
      </div>

      {/* ── Navbar ── */}
      <nav
        className="relative z-10 shadow-sm border-b"
        style={{
          background: 'rgba(0,109,119,0.92)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(131,197,190,0.3)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                style={{ background: 'rgba(131,197,190,0.25)', border: '1px solid rgba(131,197,190,0.4)' }}
              >
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">Psy-Fi</h1>
                <p className="text-xs font-medium" style={{ color: 'var(--almondSilk)' }}>
                  Admin Console
                </p>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3">
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(226,149,120,0.2)', border: '1px solid rgba(226,149,120,0.4)' }}
              >
                <ShieldCheck className="w-4 h-4" style={{ color: 'var(--almondSilk)' }} />
                <span className="text-xs font-bold" style={{ color: 'var(--almondSilk)' }}>
                  {profile?.name || 'Admin'}
                </span>
              </div>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh data"
                className="p-2 rounded-xl transition-all hover:scale-105 disabled:opacity-50"
                style={{ background: 'rgba(131,197,190,0.2)', border: '1px solid rgba(131,197,190,0.3)' }}
              >
                <RefreshCw
                  className={`w-4 h-4 text-white ${refreshing ? 'animate-spin' : ''}`}
                />
              </button>

              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-2 rounded-xl transition-all hover:scale-105"
                style={{ background: 'rgba(226,149,120,0.2)', border: '1px solid rgba(226,149,120,0.4)' }}
              >
                <LogOut className="w-5 h-5" style={{ color: 'var(--almondSilk)' }} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Error banner */}
        {error && (
          <div
            className="p-4 rounded-xl border text-sm font-medium"
            style={{ background: '#fff0ed', borderColor: 'var(--tangerineDream)', color: '#c0392b' }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* ── Section 1: Global Metrics ── */}
        <section>
          <SectionHeader
            icon={BarChart3}
            title="Global Metrics"
            subtitle="Platform-wide snapshot"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <MetricCard
              icon={Users}
              label="Total Registered Users"
              value={users.length}
              sub={`${users.filter(u => u.role === 'admin').length} admin(s) · ${users.filter(u => u.role === 'user').length} regular users`}
            />
            <MetricCard
              icon={Receipt}
              label="Total Transactions Logged"
              value={totalTransactions.toLocaleString('en-IN')}
              sub={`Across ${users.length} users`}
              accent="#a855f7"
            />
          </div>
        </section>

        {/* ── Section 2: Behavioral Analytics ── */}
        <section>
          <SectionHeader
            icon={TrendingUp}
            title="Behavioral Analytics"
            subtitle="Aggregated platform data — no individual receipts exposed"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Top Spending Categories */}
            <div
              className="rounded-2xl p-6 shadow-md border"
              style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
            >
              <h3 className="text-sm font-bold mb-4 uppercase tracking-wide" style={{ color: 'var(--stormyTeal)' }}>
                Top Spending Categories
              </h3>
              {categoryStats.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--pearlAqua)' }}>
                  No transaction data yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {categoryStats.map((cat, i) => (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold" style={{ color: 'var(--stormyTeal)' }}>
                          {i + 1}. {cat.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs" style={{ color: 'var(--pearlAqua)' }}>
                            {cat.count} txns
                          </span>
                          <span className="text-xs font-bold" style={{ color: 'var(--stormyTeal)' }}>
                            {formatINR(cat.total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--aliceBlue)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.round((cat.count / maxCatCount) * 100)}%`,
                            background: 'linear-gradient(90deg, var(--stormyTeal), var(--pearlAqua))',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overall Mood Distribution */}
            <div
              className="rounded-2xl p-6 shadow-md border"
              style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
            >
              <h3 className="text-sm font-bold mb-4 uppercase tracking-wide" style={{ color: 'var(--stormyTeal)' }}>
                Overall App Mood Distribution
              </h3>
              {moodStats.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--pearlAqua)' }}>
                  No mood data yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {moodStats.map((m) => {
                    const Icon = m.icon;
                    const pct = Math.round((m.count / totalMoodCount) * 100);
                    return (
                      <div key={m.mood}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" style={{ color: m.color }} />
                            <span className="text-sm font-semibold" style={{ color: 'var(--stormyTeal)' }}>
                              {m.mood}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: 'var(--pearlAqua)' }}>
                              {m.count} txns
                            </span>
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: `${m.color}18`, color: m.color }}
                            >
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--aliceBlue)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: m.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Section 3: User Management ── */}
        <section>
          <SectionHeader
            icon={UserCog}
            title="User Management"
            subtitle={`${users.length} registered account${users.length !== 1 ? 's' : ''}`}
          />
          <div
            className="rounded-2xl shadow-md border overflow-hidden"
            style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
          >
            {/* Table header */}
            <div
              className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-bold uppercase tracking-wide border-b"
              style={{
                background: 'linear-gradient(135deg, var(--stormyTeal), #004d57)',
                color: 'var(--almondSilk)',
                borderColor: 'rgba(131,197,190,0.2)',
              }}
            >
              <span className="col-span-4">Name</span>
              <span className="col-span-5">Email</span>
              <span className="col-span-2 text-center">Role</span>
              <span className="col-span-1 text-center">Action</span>
            </div>

            {/* Rows */}
            {users.length === 0 ? (
              <div className="py-10 text-center">
                <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--pearlAqua)' }} />
                <p className="text-sm" style={{ color: 'var(--pearlAqua)' }}>No users found.</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(131,197,190,0.15)' }}>
                {users.map((u, idx) => (
                  <div
                    key={u.id}
                    className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center transition-colors hover:bg-slate-50"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    {/* Name */}
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                        style={{ background: u.role === 'admin' ? 'var(--tangerineDream)' : 'var(--stormyTeal)' }}
                      >
                        {(u.name?.[0] ?? '?').toUpperCase()}
                      </div>
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: 'var(--stormyTeal)' }}
                      >
                        {u.name || '—'}
                      </span>
                    </div>

                    {/* Email */}
                    <div className="col-span-5 min-w-0">
                      <span
                        className="text-sm truncate block"
                        style={{ color: 'var(--pearlAqua)' }}
                      >
                        {u.email}
                      </span>
                    </div>

                    {/* Role badge */}
                    <div className="col-span-2 flex justify-center">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full capitalize"
                        style={
                          u.role === 'admin'
                            ? { background: 'rgba(226,149,120,0.15)', color: 'var(--tangerineDream)', border: '1px solid rgba(226,149,120,0.4)' }
                            : { background: 'rgba(0,109,119,0.08)', color: 'var(--stormyTeal)', border: '1px solid rgba(131,197,190,0.4)' }
                        }
                      >
                        {u.role}
                      </span>
                    </div>

                    {/* Suspend button (placeholder — requires server-side Admin SDK) */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        disabled
                        title="Suspend requires Firebase Admin SDK (coming soon)"
                        className="p-2 rounded-xl opacity-40 cursor-not-allowed transition-all"
                        style={{ background: 'rgba(226,149,120,0.15)', border: '1px solid rgba(226,149,120,0.3)' }}
                      >
                        <Ban className="w-4 h-4" style={{ color: 'var(--tangerineDream)' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-center" style={{ color: 'var(--pearlAqua)' }}>
            🔒 Suspend functionality requires the Firebase Admin SDK via a server-side Cloud Function.
          </p>
        </section>

      </main>
    </div>
  );
}
