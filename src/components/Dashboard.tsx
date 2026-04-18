import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBalance } from '../hooks/useBalance';
import {
  collection, query, where, orderBy, onSnapshot,
} from 'firebase/firestore';
import { db, AuditEntry, FixedRule, formatINR } from '../lib/firebase';
import ExpenseTracker from './ExpenseTracker';
import SafetyMeter from './SafetyMeter';
import BehavioralHistory from './BehavioralHistory';
import FixedExpenses from './FixedExpenses';
import ReportsDashboard from './ReportsDashboard';
import { LogOut, Brain, Wallet, ShieldCheck, GitBranch } from 'lucide-react';

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [auditEntries,  setAuditEntries]  = useState<AuditEntry[]>([]);
  const [fixedRules,    setFixedRules]    = useState<FixedRule[]>([]);
  
  const { initialBudget, currentBalance, updateInitialBudget } = useBalance();

  // ── 1. Real-time listener: audit_entries ──────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'audit_entries'),
      where('user_id', '==', user.uid),
      orderBy('purchase_date', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAuditEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditEntry)));
      },
      (err) => console.error('audit_entries listener error:', err)
    );
    return () => unsub();
  }, [user]);

  // ── 2. Real-time listener: fixed_rules ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'fixed_rules'),
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setFixedRules(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FixedRule)));
      },
      (err) => console.error('fixed_rules listener error:', err)
    );
    return () => unsub();
  }, [user]);

  // ── Derived values flowing to SafetyMeter ────────────────────────────────
  const totalSpent    = auditEntries.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const fixedExpenses = fixedRules.reduce((sum, r)   => sum + parseFloat(r.amount.toString()), 0);

  const handleSignOut = async () => {
    try { await signOut(); } catch (e) { console.error(e); }
  };

  const isChanges = location.pathname === '/changes';

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--aliceBlue)' }}>

      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--stormyTeal)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--pearlAqua)', transform: 'translate(-30%, 30%)' }} />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full opacity-5 blur-3xl"
          style={{ background: 'var(--almondSilk)', transform: 'translate(-50%, -50%)' }} />
      </div>

      {/* Navbar */}
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                style={{ background: 'rgba(131,197,190,0.25)', border: '1px solid rgba(131,197,190,0.4)' }}>
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">Psy-Fi</h1>
                <p className="text-xs font-medium" style={{ color: 'var(--pearlAqua)' }}>
                  Mindful Finance Expense Tracker
                </p>
              </div>
            </div>

            {/* Nav links */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => navigate('/')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={
                  !isChanges
                    ? { background: 'rgba(255,255,255,0.18)', color: 'white' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.65)' }
                }
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/changes')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={
                  isChanges
                    ? { background: 'rgba(255,255,255,0.18)', color: 'white' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.65)' }
                }
              >
                <GitBranch className="w-3.5 h-3.5" />
                Changes
              </button>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3">
              {/* Balance input & display */}
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(131,197,190,0.15)', border: '1px solid rgba(131,197,190,0.3)' }}
              >
                <Wallet className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--pearlAqua)' }} />
                <div className="flex flex-col">
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--pearlAqua)' }}>
                    Current Balance
                  </div>
                  <div className="text-sm font-extrabold text-white">
                    {formatINR(currentBalance)}
                  </div>
                </div>
                <div className="h-6 w-px bg-white/20 mx-1 hidden sm:block"></div>
                <div className="flex-col hidden sm:flex">
                  <div className="text-[10px] font-medium" style={{ color: 'var(--pearlAqua)' }}>Budget (₹)</div>
                  <input
                    type="number"
                    value={initialBudget}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      updateInitialBudget(val);
                    }}
                    className="w-20 bg-transparent text-white/80 text-xs font-bold outline-none"
                    placeholder="₹0"
                  />
                </div>
              </div>

              {/* User info */}
              <div className="text-right hidden sm:block">
                <div className="text-white font-semibold text-sm">{profile?.name || 'User'}</div>
                <div className="text-xs" style={{ color: 'var(--pearlAqua)' }}>{profile?.email}</div>
              </div>

              <button
                onClick={handleSignOut}
                className="p-2 rounded-xl transition-all hover:scale-105"
                style={{ background: 'rgba(226,149,120,0.2)', border: '1px solid rgba(226,149,120,0.4)' }}
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" style={{ color: 'var(--almondSilk)' }} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome banner */}
        <div
          className="rounded-2xl p-5 mb-7 flex items-center gap-4 shadow-md"
          style={{ background: 'linear-gradient(135deg, var(--stormyTeal), #004d57)', color: 'white' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            <ShieldCheck className="w-7 h-7" style={{ color: 'var(--almondSilk)' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">
              Welcome back, {profile?.name?.split(' ')[0] || 'there'}! 👋
            </h2>
            <p className="text-sm opacity-80">
              Your Expense Tracker is ready — track spending, audit emotions, stay financially mindful.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* onEntryAdded is a no-op — onSnapshot handles real-time updates */}
            <ExpenseTracker
              onEntryAdded={() => {}}
              fixedRules={fixedRules}
              auditEntries={auditEntries}
            />
            <BehavioralHistory entries={auditEntries} />
            <ReportsDashboard entries={auditEntries} fixedRules={fixedRules} />
          </div>
          <div className="space-y-6">
            {/* SafetyMeter reactively recalculates whenever auditEntries or fixedRules change */}
            <SafetyMeter
              totalSpent={totalSpent}
              fixedExpenses={fixedExpenses}
              totalBalance={initialBudget}
            />
            {/* onUpdate is a no-op now — onSnapshot in both Dashboard and FixedExpenses handle it */}
            <FixedExpenses onUpdate={() => {}} />
          </div>
        </div>
      </main>
    </div>
  );
}
