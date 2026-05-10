import { useState, useEffect, useRef } from 'react';
import {
  doc, onSnapshot, updateDoc, setDoc, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import {
  Brain, Settings2, LogOut, ShieldCheck, Plus, X, Tag, Wallet,
  RefreshCw, Check, Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ── Constants ─────────────────────────────────────────────────────────────────

const GLOBAL_SETTINGS_DOC = doc(db, 'global_settings', 'dropdown_options');

// ── Types ─────────────────────────────────────────────────────────────────────

interface GlobalSettings {
  categories: string[];
  payment_sources: string[];
  fixed_expenses: string[];
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

interface TagListProps {
  items: string[];
  onRemove: (item: string) => void;
  removing: string | null;
  accentColor?: string;
}

function TagList({ items, onRemove, removing, accentColor = 'var(--stormyTeal)' }: TagListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-center py-6" style={{ color: 'var(--pearlAqua)' }}>
        No items yet. Add one below.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2 min-h-[44px]">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all"
          style={{
            background: `${accentColor}12`,
            borderColor: `${accentColor}40`,
            color: accentColor,
          }}
        >
          {item}
          <button
            type="button"
            onClick={() => onRemove(item)}
            disabled={removing === item}
            title={`Remove ${item}`}
            className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-40"
            style={{ background: `${accentColor}25` }}
          >
            {removing === item
              ? <Loader2 className="w-2.5 h-2.5 animate-spin" style={{ color: accentColor }} />
              : <X className="w-2.5 h-2.5" style={{ color: accentColor }} />}
          </button>
        </span>
      ))}
    </div>
  );
}

interface AddItemRowProps {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  adding: boolean;
  placeholder: string;
  successItem: string | null;
}

function AddItemRow({ value, onChange, onAdd, adding, placeholder, successItem }: AddItemRowProps) {
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); onAdd(); }
  };
  return (
    <div className="flex gap-2 mt-4">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className="flex-1 px-4 py-2.5 rounded-xl border-2 text-sm outline-none transition-all"
        style={{
          background: 'rgba(237,246,249,0.8)',
          borderColor: 'var(--pearlAqua)',
          color: 'var(--stormyTeal)',
        }}
      />
      <button
        type="button"
        onClick={onAdd}
        disabled={adding || !value.trim()}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-50 shadow-md"
        style={{ background: 'linear-gradient(135deg, var(--stormyTeal), var(--pearlAqua))' }}
      >
        {adding
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : successItem
          ? <Check className="w-4 h-4" />
          : <Plus className="w-4 h-4" />}
        {adding ? 'Adding…' : 'Add'}
      </button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function GlobalSettingsManager() {
  const { profile, signOut } = useAuth();

  const [settings, setSettings] = useState<GlobalSettings>({ categories: [], payment_sources: [], fixed_expenses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const categoryTimeoutRef = useRef<NodeJS.Timeout>();
  const sourceTimeoutRef = useRef<NodeJS.Timeout>();
  const expenseTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (categoryTimeoutRef.current) clearTimeout(categoryTimeoutRef.current);
      if (sourceTimeoutRef.current) clearTimeout(sourceTimeoutRef.current);
      if (expenseTimeoutRef.current) clearTimeout(expenseTimeoutRef.current);
    };
  }, []);

  // Category add state
  const [newCategory, setNewCategory] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [lastAddedCategory, setLastAddedCategory] = useState<string | null>(null);
  const [removingCategory, setRemovingCategory] = useState<string | null>(null);

  // Payment source add state
  const [newSource, setNewSource] = useState('');
  const [addingSource, setAddingSource] = useState(false);
  const [lastAddedSource, setLastAddedSource] = useState<string | null>(null);
  const [removingSource, setRemovingSource] = useState<string | null>(null);

  // Fixed Expense add state
  const [newExpense, setNewExpense] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);
  const [lastAddedExpense, setLastAddedExpense] = useState<string | null>(null);
  const [removingExpense, setRemovingExpense] = useState<string | null>(null);

  // ── Real-time listener on global_settings ──────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      GLOBAL_SETTINGS_DOC,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            categories: Array.isArray(data.categories) ? data.categories : [],
            payment_sources: Array.isArray(data.payment_sources) ? data.payment_sources : [],
            fixed_expenses: Array.isArray(data.fixed_expenses) ? data.fixed_expenses : [],
          });
        } else {
          // Document doesn't exist yet; show empty state
          setSettings({ categories: [], payment_sources: [], fixed_expenses: [] });
        }
        setLoading(false);
      },
      (err) => {
        console.error('GlobalSettingsManager snapshot error:', err);
        setError('Failed to load global settings. Check Firestore rules.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ── Ensure doc exists before mutating ─────────────────────────────────────
  const ensureDoc = async () => {
    await setDoc(GLOBAL_SETTINGS_DOC, {}, { merge: true });
  };

  // ── Add Category ───────────────────────────────────────────────────────────
  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed || addingCategory) return;
    if (settings.categories.includes(trimmed)) {
      setError(`"${trimmed}" is already in the list.`);
      return;
    }
    setAddingCategory(true);
    setError('');
    try {
      await ensureDoc();
      await updateDoc(GLOBAL_SETTINGS_DOC, { categories: arrayUnion(trimmed) });
      setNewCategory('');
      setLastAddedCategory(trimmed);
      if (categoryTimeoutRef.current) clearTimeout(categoryTimeoutRef.current);
      categoryTimeoutRef.current = setTimeout(() => setLastAddedCategory(null), 2000);
    } catch (err) {
      console.error('Add category error:', err);
      setError('Failed to add category.');
    } finally {
      setAddingCategory(false);
    }
  };

  // ── Remove Category ────────────────────────────────────────────────────────
  const handleRemoveCategory = async (item: string) => {
    setRemovingCategory(item);
    setError('');
    try {
      await updateDoc(GLOBAL_SETTINGS_DOC, { categories: arrayRemove(item) });
    } catch (err) {
      console.error('Remove category error:', err);
      setError('Failed to remove category.');
    } finally {
      setRemovingCategory(null);
    }
  };

  // ── Add Payment Source ─────────────────────────────────────────────────────
  const handleAddSource = async () => {
    const trimmed = newSource.trim();
    if (!trimmed || addingSource) return;
    if (settings.payment_sources.includes(trimmed)) {
      setError(`"${trimmed}" is already in the list.`);
      return;
    }
    setAddingSource(true);
    setError('');
    try {
      await ensureDoc();
      await updateDoc(GLOBAL_SETTINGS_DOC, { payment_sources: arrayUnion(trimmed) });
      setNewSource('');
      setLastAddedSource(trimmed);
      if (sourceTimeoutRef.current) clearTimeout(sourceTimeoutRef.current);
      sourceTimeoutRef.current = setTimeout(() => setLastAddedSource(null), 2000);
    } catch (err) {
      console.error('Add source error:', err);
      setError('Failed to add payment source.');
    } finally {
      setAddingSource(false);
    }
  };

  // ── Remove Payment Source ──────────────────────────────────────────────────
  const handleRemoveSource = async (item: string) => {
    setRemovingSource(item);
    setError('');
    try {
      await updateDoc(GLOBAL_SETTINGS_DOC, { payment_sources: arrayRemove(item) });
    } catch (err) {
      console.error('Remove source error:', err);
      setError('Failed to remove payment source.');
    } finally {
      setRemovingSource(null);
    }
  };

  // ── Add Fixed Expense ──────────────────────────────────────────────────────
  const handleAddExpense = async () => {
    const trimmed = newExpense.trim();
    if (!trimmed || addingExpense) return;
    if (settings.fixed_expenses.includes(trimmed)) {
      setError(`"${trimmed}" is already in the list.`);
      return;
    }
    setAddingExpense(true);
    setError('');
    try {
      await ensureDoc();
      await updateDoc(GLOBAL_SETTINGS_DOC, { fixed_expenses: arrayUnion(trimmed) });
      setNewExpense('');
      setLastAddedExpense(trimmed);
      if (expenseTimeoutRef.current) clearTimeout(expenseTimeoutRef.current);
      expenseTimeoutRef.current = setTimeout(() => setLastAddedExpense(null), 2000);
    } catch (err) {
      console.error('Add expense error:', err);
      setError('Failed to add fixed expense.');
    } finally {
      setAddingExpense(false);
    }
  };

  // ── Remove Fixed Expense ───────────────────────────────────────────────────
  const handleRemoveExpense = async (item: string) => {
    setRemovingExpense(item);
    setError('');
    try {
      await updateDoc(GLOBAL_SETTINGS_DOC, { fixed_expenses: arrayRemove(item) });
    } catch (err) {
      console.error('Remove expense error:', err);
      setError('Failed to remove fixed expense.');
    } finally {
      setRemovingExpense(null);
    }
  };

  const handleSignOut = async () => {
    try { await signOut(); } catch (e) { console.error(e); }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--aliceBlue)' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl animate-pulse"
            style={{ background: 'var(--stormyTeal)' }}
          >
            <Settings2 className="w-8 h-8 text-white" />
          </div>
          <div className="text-lg font-bold" style={{ color: 'var(--stormyTeal)' }}>
            Loading Global Settings…
          </div>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center gap-6">
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
                    Global Settings
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 border-l pl-6" style={{ borderColor: 'rgba(131,197,190,0.3)' }}>
                <Link to="/admin" className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all text-white/70 hover:text-white hover:bg-white/10">
                  Metrics
                </Link>
                <Link to="/admin/users" className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all text-white/70 hover:text-white hover:bg-white/10">
                  User Management
                </Link>
                <Link to="/admin/settings" className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all bg-white/20 text-white">
                  Global Settings
                </Link>
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
                onClick={handleSignOut}
                title="Sign Out"
                className="p-2 rounded-xl transition-all hover:scale-105"
                style={{ background: 'rgba(226,149,120,0.2)', border: '1px solid rgba(226,149,120,0.4)' }}
              >
                <LogOut className="w-5 h-5" style={{ color: 'var(--almondSilk)' }} />
              </button>
            </div>
          </div>

          {/* Mobile Nav */}
          <div className="sm:hidden flex items-center gap-1 pb-3 pt-1 border-t border-white/10 mt-1">
            <Link to="/admin" className="px-2 py-1.5 rounded-lg text-xs font-semibold transition-all text-white/70 hover:text-white hover:bg-white/10 flex-1 text-center">
              Metrics
            </Link>
            <Link to="/admin/users" className="px-2 py-1.5 rounded-lg text-xs font-semibold transition-all text-white/70 hover:text-white hover:bg-white/10 flex-1 text-center">
              Users
            </Link>
            <Link to="/admin/settings" className="px-2 py-1.5 rounded-lg text-xs font-semibold transition-all bg-white/20 text-white flex-1 text-center">
              Settings
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--stormyTeal)' }}>
            Global Dropdown Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--pearlAqua)' }}>
            Changes here propagate in real-time to all users' Expense Tracker dropdowns.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="p-4 rounded-xl border text-sm font-medium flex items-center gap-2"
            style={{ background: '#fff0ed', borderColor: 'var(--tangerineDream)', color: '#c0392b' }}
          >
            ⚠️ {error}
            <button
              type="button"
              onClick={() => setError('')}
              className="ml-auto p-1 rounded-lg hover:bg-red-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Live sync indicator */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: '#ecfdf512', color: '#10b981', border: '1px solid #10b98130' }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live — Firestore real-time sync active
        </div>

        {/* ── Categories Panel ── */}
        <section
          className="rounded-2xl p-6 shadow-md border"
          style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
        >
          <SectionHeader
            icon={Tag}
            title="Spending Categories"
            subtitle={`${settings.categories.length} item${settings.categories.length !== 1 ? 's' : ''} — shown in Category dropdown for all users`}
          />

          <TagList
            items={settings.categories}
            onRemove={handleRemoveCategory}
            removing={removingCategory}
            accentColor="var(--stormyTeal)"
          />

          <AddItemRow
            value={newCategory}
            onChange={setNewCategory}
            onAdd={handleAddCategory}
            adding={addingCategory}
            placeholder="e.g. Gym, Subscriptions, Rent…"
            successItem={lastAddedCategory}
          />

          {lastAddedCategory && (
            <p className="text-xs mt-2 font-semibold" style={{ color: '#10b981' }}>
              ✅ "{lastAddedCategory}" added successfully.
            </p>
          )}
        </section>

        {/* ── Payment Sources Panel ── */}
        <section
          className="rounded-2xl p-6 shadow-md border"
          style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
        >
          <SectionHeader
            icon={Wallet}
            title="Payment Sources"
            subtitle={`${settings.payment_sources.length} item${settings.payment_sources.length !== 1 ? 's' : ''} — shown as payment method pills for all users`}
          />

          <TagList
            items={settings.payment_sources}
            onRemove={handleRemoveSource}
            removing={removingSource}
            accentColor="var(--pearlAqua)"
          />

          <AddItemRow
            value={newSource}
            onChange={setNewSource}
            onAdd={handleAddSource}
            adding={addingSource}
            placeholder="e.g. Navi, CRED, NetBanking…"
            successItem={lastAddedSource}
          />

          {lastAddedSource && (
            <p className="text-xs mt-2 font-semibold" style={{ color: '#10b981' }}>
              ✅ "{lastAddedSource}" added successfully.
            </p>
          )}
        </section>

        {/* ── Fixed Expenses Panel ── */}
        <section
          className="rounded-2xl p-6 shadow-md border"
          style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
        >
          <SectionHeader
            icon={Tag}
            title="Fixed Expenses"
            subtitle={`${settings.fixed_expenses.length} item${settings.fixed_expenses.length !== 1 ? 's' : ''} — shown as fixed expense templates for all users`}
          />

          <TagList
            items={settings.fixed_expenses}
            onRemove={handleRemoveExpense}
            removing={removingExpense}
            accentColor="var(--tangerineDream)"
          />

          <AddItemRow
            value={newExpense}
            onChange={setNewExpense}
            onAdd={handleAddExpense}
            adding={addingExpense}
            placeholder="e.g. Rent, Netflix, Gym…"
            successItem={lastAddedExpense}
          />

          {lastAddedExpense && (
            <p className="text-xs mt-2 font-semibold" style={{ color: '#10b981' }}>
              ✅ "{lastAddedExpense}" added successfully.
            </p>
          )}
        </section>

        {/* ── Info box ── */}
        <div
          className="rounded-2xl p-5 border flex items-start gap-3"
          style={{ background: 'rgba(131,197,190,0.08)', borderColor: 'rgba(131,197,190,0.35)' }}
        >
          <RefreshCw className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--pearlAqua)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--stormyTeal)' }}>
              How this works
            </p>
            <ul className="text-xs mt-1.5 space-y-1" style={{ color: 'var(--pearlAqua)' }}>
              <li>• All items live in <code className="font-mono bg-slate-100 px-1 rounded">global_settings/dropdown_options</code> in Firestore.</li>
              <li>• The Expense Tracker uses <code className="font-mono bg-slate-100 px-1 rounded">onSnapshot</code> — changes appear instantly without a page reload.</li>
              <li>• <code className="font-mono bg-slate-100 px-1 rounded">arrayUnion</code> / <code className="font-mono bg-slate-100 px-1 rounded">arrayRemove</code> make each mutation atomic.</li>
              <li>• Moods are hardcoded in the client and are <strong>not</strong> managed here.</li>
            </ul>
          </div>
        </div>

      </main>
    </div>
  );
}
