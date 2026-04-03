import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, AuditEntry, formatINR } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import {
  Brain, ArrowLeft, GitBranch, Tag, CreditCard,
  RefreshCw, SearchX, Sparkles,
} from 'lucide-react';

// ─── Constants (must match Auditor.tsx exactly) ─────────────────────────────────

const DEFAULT_CATEGORIES = [
  'Food & Dining', 'Shopping', 'Travel', 'Entertainment',
  'Healthcare', 'Bills & Utilities', 'Education', 'Other',
];

const DEFAULT_PAYMENT_SOURCES = ['GPay', 'Paytm', 'PhonePe', 'Cash', 'Card', 'Other'];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isCustomCategory(cat: string): boolean {
  return !DEFAULT_CATEGORIES.includes(cat);
}

function isCustomPaymentSource(src: string): boolean {
  return !DEFAULT_PAYMENT_SOURCES.includes(src);
}

function isChangeEntry(entry: AuditEntry): boolean {
  return isCustomCategory(entry.spending_category) || isCustomPaymentSource(entry.source_of_payment);
}

// ─── Badge components ──────────────────────────────────────────────────────────

function CustomBadge({ label, type }: { label: string; type: 'category' | 'payment' }) {
  const isCat = type === 'category';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={
        isCat
          ? { background: 'rgba(168,85,247,0.12)', color: '#9333ea', border: '1px solid rgba(168,85,247,0.3)' }
          : { background: 'rgba(226,149,120,0.15)', color: '#c2410c', border: '1px solid rgba(226,149,120,0.4)' }
      }
    >
      {isCat ? <Tag className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
      {label}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ChangesPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [allEntries, setAllEntries]     = useState<AuditEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterType, setFilterType]     = useState<'all' | 'category' | 'payment'>('all');

  const fetchEntries = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // No orderBy here — avoids requiring a Firestore composite index.
      // We sort client-side after fetching, which is fine for per-user data.
      const q = query(
        collection(db, 'audit_entries'),
        where('user_id', '==', user.uid)
      );
      const snap = await getDocs(q);
      const entries = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as AuditEntry))
        .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());
      setAllEntries(entries.filter(isChangeEntry));
    } catch (err) {
      console.error('Failed to fetch change entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [user]);

  // Apply secondary filter
  const displayed = allEntries.filter((e) => {
    if (filterType === 'category') return isCustomCategory(e.spending_category);
    if (filterType === 'payment')  return isCustomPaymentSource(e.source_of_payment);
    return true;
  });

  const customCatCount  = allEntries.filter((e) => isCustomCategory(e.spending_category)).length;
  const customPayCount  = allEntries.filter((e) => isCustomPaymentSource(e.source_of_payment)).length;

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--aliceBlue)' }}>

      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--stormyTeal)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--pearlAqua)', transform: 'translate(-30%, 30%)' }} />
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                style={{ background: 'rgba(131,197,190,0.25)', border: '1px solid rgba(131,197,190,0.4)' }}>
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">Psy-Fi</h1>
                <p className="text-xs font-medium" style={{ color: 'var(--pearlAqua)' }}>
                  Mindful Finance Auditor
                </p>
              </div>
            </div>

            {/* Nav links */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => navigate('/')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{ background: 'transparent', color: 'rgba(255,255,255,0.65)' }}
              >
                Dashboard
              </button>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{ background: 'rgba(255,255,255,0.18)', color: 'white' }}
              >
                <GitBranch className="w-3.5 h-3.5" />
                Changes
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-white font-semibold text-sm">{profile?.name || 'User'}</div>
                <div className="text-xs" style={{ color: 'var(--pearlAqua)' }}>{profile?.email}</div>
              </div>
              <button
                onClick={() => signOut()}
                className="p-2 rounded-xl transition-all hover:scale-105"
                style={{ background: 'rgba(226,149,120,0.2)', border: '1px solid rgba(226,149,120,0.4)' }}
                title="Sign Out"
              >
                <ArrowLeft className="w-5 h-5" style={{ color: 'var(--almondSilk)' }} onClick={(e) => { e.stopPropagation(); navigate('/'); }} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div
          className="rounded-2xl p-6 mb-7 shadow-md"
          style={{ background: 'linear-gradient(135deg, #3b0764, #6b21a8)', color: 'white' }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <GitBranch className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-extrabold mb-1">Auditor Changes Log</h2>
              <p className="text-sm opacity-80">
                Entries where you added a <strong>custom category</strong> or a <strong>custom payment source</strong> — 
                inputs that were not part of the original pre-defined options.
              </p>
            </div>
            <button
              onClick={fetchEntries}
              title="Refresh"
              className="p-2.5 rounded-xl transition-all hover:scale-105 flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Stats row */}
          <div className="mt-5 grid grid-cols-3 gap-4">
            {[
              { label: 'Total Custom Entries', value: allEntries.length, emoji: '🔖' },
              { label: 'Custom Categories',    value: customCatCount,     emoji: '🏷️' },
              { label: 'Custom Payment Sources', value: customPayCount,   emoji: '💳' },
            ].map(({ label, value, emoji }) => (
              <div
                key={label}
                className="rounded-xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}
              >
                <div className="text-xl mb-0.5">{emoji}</div>
                <div className="text-xl font-extrabold">{value}</div>
                <div className="text-xs opacity-70 leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter tabs */}
        <div
          className="flex rounded-xl overflow-hidden border mb-6 w-fit shadow-sm"
          style={{ borderColor: 'rgba(131,197,190,0.4)' }}
        >
          {([ ['all', 'All Changes'], ['category', '🏷️ Custom Categories'], ['payment', '💳 Custom Payments'] ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterType(val)}
              className="px-4 py-2 text-xs font-bold transition-all"
              style={
                filterType === val
                  ? { background: 'var(--stormyTeal)', color: 'white' }
                  : { background: 'rgba(237,246,249,0.8)', color: 'var(--stormyTeal)' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--pearlAqua)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--pearlAqua)' }}>
              Scanning for custom entries…
            </p>
          </div>
        ) : displayed.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center border shadow-md"
            style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
          >
            <SearchX className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--pearlAqua)' }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--stormyTeal)' }}>
              No custom entries found
            </h3>
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              Use the <strong>+ button</strong> in the Auditor's Category field or select{' '}
              <strong>"Other"</strong> as a payment source to log a custom entry. It will appear here.
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl shadow-lg border overflow-hidden"
            style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
          >
            {/* Table header */}
            <div
              className="grid gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wide"
              style={{
                gridTemplateColumns: '2fr 0.9fr 0.85fr 1fr 1fr',
                background: 'linear-gradient(135deg, #3b0764, #6b21a8)',
                color: 'white',
              }}
            >
              <div>Product / Service</div>
              <div>Amount</div>
              <div>Date</div>
              <div>Category</div>
              <div>Payment Source</div>
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: 'rgba(131,197,190,0.18)' }}>
              {displayed.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-2 px-5 py-3.5 items-center transition-all hover:bg-purple-50"
                  style={{ gridTemplateColumns: '2fr 0.9fr 0.85fr 1fr 1fr' }}
                >
                  {/* Product */}
                  <div>
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--stormyTeal)' }}>
                      {entry.product_service}
                    </div>
                    {entry.reason && (
                      <div className="text-xs italic truncate mt-0.5" style={{ color: '#94a3b8' }}>
                        "{entry.reason}"
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="font-extrabold text-sm" style={{ color: 'var(--tangerineDream)' }}>
                    {formatINR(entry.amount)}
                  </div>

                  {/* Date */}
                  <div className="text-xs" style={{ color: '#64748b' }}>
                    {new Date(entry.purchase_date).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: '2-digit',
                    })}
                  </div>

                  {/* Category */}
                  <div>
                    {isCustomCategory(entry.spending_category) ? (
                      <CustomBadge label={entry.spending_category} type="category" />
                    ) : (
                      <span className="text-xs" style={{ color: '#94a3b8' }}>
                        {entry.spending_category}
                      </span>
                    )}
                  </div>

                  {/* Payment */}
                  <div>
                    {isCustomPaymentSource(entry.source_of_payment) ? (
                      <CustomBadge label={entry.source_of_payment} type="payment" />
                    ) : (
                      <span className="text-xs" style={{ color: '#94a3b8' }}>
                        {entry.source_of_payment}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 border-t flex items-center gap-2 text-xs font-medium"
              style={{ borderColor: 'rgba(131,197,190,0.25)', color: 'var(--pearlAqua)', background: 'rgba(237,246,249,0.4)' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Showing {displayed.length} custom entr{displayed.length === 1 ? 'y' : 'ies'}
              {filterType !== 'all' ? ` (${filterType === 'category' ? 'custom categories' : 'custom payment sources'} only)` : ''}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
