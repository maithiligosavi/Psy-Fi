import { useState, useEffect } from 'react';
import {
  collection, addDoc,
  doc, getDoc, setDoc, arrayUnion, onSnapshot, updateDoc, arrayRemove
} from 'firebase/firestore';
import { db, FixedRule, AuditEntry } from '../lib/firebase';
import { analyseEntry } from '../lib/insightEngine';
import { useAuth } from '../hooks/useAuth';
import {
  Smile, Meh, Frown, TrendingDown, TrendingUp,
  AlertTriangle, ShieldCheck, Plus, X, Trash2, ChevronDown
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const MOODS = [
  { value: 'Happy', icon: Smile, color: '#10b981' },
  { value: 'Neutral', icon: Meh, color: '#f59e0b' },
  { value: 'Sad', icon: Frown, color: '#60a5fa' },
  { value: 'Stressed', icon: TrendingDown, color: '#ef4444' },
  { value: 'Excited', icon: TrendingUp, color: '#a855f7' },
  { value: 'Bored', icon: Meh, color: '#94a3b8' },
];

const DEFAULT_CATEGORIES = [
  'Food & Dining', 'Shopping', 'Travel', 'Entertainment',
  'Healthcare', 'Bills & Utilities', 'Education', 'Add new',
];

const DEFAULT_PAYMENT_SOURCES = ['GPay', 'Paytm', 'PhonePe', 'Cash', 'Card', 'Add new'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExpenseTrackerProps {
  onEntryAdded: () => void;
  fixedRules: FixedRule[];
  auditEntries: AuditEntry[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExpenseTracker({ onEntryAdded, fixedRules, auditEntries }: ExpenseTrackerProps) {
  const { user } = useAuth();

  // ── Form state ────────────────────────────────────────────────────────────
  const [productService, setProductService] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [reason, setReason] = useState('');
  const [mood, setMood] = useState('Neutral');
  const [sourceOfPayment, setSourceOfPayment] = useState('GPay');
  const [sourceOfPaymentOther, setSourceOfPaymentOther] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [unpaidWarning, setUnpaidWarning] = useState<string[]>([]);

  // ── Dynamic categories ────────────────────────────────────────────────────
  const [allCategories, setAllCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ── Dynamic payment sources ───────────────────────────────────────────────
  const [allPaymentSources, setAllPaymentSources] = useState<string[]>(DEFAULT_PAYMENT_SOURCES);

  // ── Load user settings (custom categories + payment sources) ─────────────
  useEffect(() => {
    if (!user) {
      setAllCategories(DEFAULT_CATEGORIES);
      setAllPaymentSources(DEFAULT_PAYMENT_SOURCES);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'user_settings', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const customCats = Array.isArray(data.custom_categories) ? data.custom_categories : [];
          const exCats = Array.isArray(data.excluded_categories) ? data.excluded_categories : [];
          const customSrcs = Array.isArray(data.custom_payment_sources) ? data.custom_payment_sources : [];
          const exSrcs = Array.isArray(data.excluded_payment_sources) ? data.excluded_payment_sources : [];

          setAllCategories([
            ...DEFAULT_CATEGORIES.slice(0, -1).filter((c) => !exCats.includes(c)),
            ...customCats.filter((c: string) => !DEFAULT_CATEGORIES.includes(c) && !exCats.includes(c)),
            'Add new',
          ]);
          setAllPaymentSources([
            ...DEFAULT_PAYMENT_SOURCES.slice(0, -1).filter((s) => !exSrcs.includes(s)),
            ...customSrcs.filter((s: string) => !DEFAULT_PAYMENT_SOURCES.includes(s) && !exSrcs.includes(s)),
            'Add new',
          ]);
        } else {
          setAllCategories(DEFAULT_CATEGORIES);
          setAllPaymentSources(DEFAULT_PAYMENT_SOURCES);
        }
      },
      (err) => console.error('Failed to load user settings:', err)
    );
    return () => unsub();
  }, [user]);

  const checkUnpaidFixed = () => {
    if (!user || fixedRules.length === 0) return;
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const paidThisMonth = auditEntries
      .filter((e) => e.purchase_date.startsWith(monthYear))
      .map((e) => e.product_service?.toLowerCase() ?? '');
    const unpaid = fixedRules.filter(
      (r) => !paidThisMonth.some((p) => p.includes(r.expense_name.toLowerCase()))
    );
    setUnpaidWarning(unpaid.map((r) => r.expense_name));
  };

  useEffect(() => {
    checkUnpaidFixed();
  }, [auditEntries, fixedRules]);

  const handleAddCategory = async () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed || !user) return;
    if (allCategories.includes(trimmed)) {
      setCategory(trimmed);
      setShowAddCategory(false);
      setNewCategoryInput('');
      return;
    }
    setSavingCategory(true);
    try {
      const settingsRef = doc(db, 'user_settings', user.uid);
      await setDoc(settingsRef, { custom_categories: arrayUnion(trimmed) }, { merge: true });
      setAllCategories((prev) => {
        const withoutAdd = prev.filter((c) => c !== 'Add new');
        return [...withoutAdd, trimmed, 'Add new'];
      });
      setCategory(trimmed);
      setShowAddCategory(false);
      setNewCategoryInput('');
    } catch (err) {
      console.error('Failed to save custom category:', err);
    } finally {
      setSavingCategory(false);
    }
  };

  const saveCustomSource = async (value: string) => {
    if (!value || !user) return;
    if (DEFAULT_PAYMENT_SOURCES.includes(value)) return;
    try {
      const settingsRef = doc(db, 'user_settings', user.uid);
      await setDoc(settingsRef, { custom_payment_sources: arrayUnion(value) }, { merge: true });
      setAllPaymentSources((prev) => {
        if (prev.includes(value)) return prev;
        const withoutAdd = prev.filter((s) => s !== 'Add new');
        return [...withoutAdd, value, 'Add new'];
      });
    } catch (err) {
      console.error('Failed to save custom payment source:', err);
    }
  };

  const deleteCategory = async (cat: string) => {
    if (!user || cat === 'Add new') return;
    try {
      const settingsRef = doc(db, 'user_settings', user.uid);
      if (DEFAULT_CATEGORIES.includes(cat)) {
        await setDoc(settingsRef, { excluded_categories: arrayUnion(cat) }, { merge: true });
      } else {
        await updateDoc(settingsRef, { custom_categories: arrayRemove(cat) });
      }
      if (category === cat) {
        const remaining = allCategories.find((c) => c !== cat && c !== 'Add new');
        setCategory(remaining || 'Add new');
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  const deletePaymentSource = async (src: string) => {
    if (!user || src === 'Add new') return;
    try {
      const settingsRef = doc(db, 'user_settings', user.uid);
      if (DEFAULT_PAYMENT_SOURCES.includes(src)) {
        await setDoc(settingsRef, { excluded_payment_sources: arrayUnion(src) }, { merge: true });
      } else {
        await updateDoc(settingsRef, { custom_payment_sources: arrayRemove(src) });
      }
      if (sourceOfPayment === src) {
        const remaining = allPaymentSources.find((s) => s !== src && s !== 'Add new');
        setSourceOfPayment(remaining || 'Add new');
      }
    } catch (err) {
      console.error('Failed to delete payment source:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const finalCategory = category.trim();
    // Logic changed to check for 'Add new'
    const finalSource =
      sourceOfPayment === 'Add new' ? sourceOfPaymentOther.trim() : sourceOfPayment;

    if (sourceOfPayment === 'Add new' && !finalSource) {
      setError('Please enter a custom payment source.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      if (sourceOfPayment === 'Add new' && finalSource) {
        await saveCustomSource(finalSource);
      }

      const insight = analyseEntry({
        mood,
        spending_type: undefined,
        amount: parseFloat(amount),
        reason: reason.trim(),
        spending_category: finalCategory,
      });

      await addDoc(collection(db, 'audit_entries'), {
        user_id: user.uid,
        product_service: productService.trim(),
        amount: parseFloat(amount),
        spending_category: finalCategory,
        reason: reason.trim(),
        mood,
        source_of_payment: finalSource,
        purchase_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        insight_summary: insight.summary,
        insight_triggers: insight.triggers,
        insight_risk: insight.risk,
        insight_recommendation: insight.recommendation,
      });

      setSuccess(true);
      setProductService('');
      setAmount('');
      setReason('');
      setMood('Neutral');
      setSourceOfPayment('GPay');
      setSourceOfPaymentOther('');
      setTimeout(() => setSuccess(false), 3000);
      onEntryAdded();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(237,246,249,0.8)',
    borderColor: 'var(--pearlAqua)',
    color: 'var(--stormyTeal)',
  };

  return (
    <div
      className="rounded-2xl p-6 shadow-lg border"
      style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
          style={{ background: 'linear-gradient(135deg, var(--stormyTeal), var(--pearlAqua))' }}
        >
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: 'var(--stormyTeal)' }}>
            Expense Tracker
          </h2>
          <p className="text-sm" style={{ color: 'var(--pearlAqua)' }}>Audit your emotional spending</p>
        </div>
      </div>

      {unpaidWarning.length > 0 && (
        <div
          className="mb-5 p-4 rounded-xl flex items-start gap-3 border"
          style={{ background: '#fff7ed', borderColor: 'var(--tangerineDream)', color: '#92400e' }}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--tangerineDream)' }} />
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--tangerineDream)' }}>
              ⚠ Unpaid Fixed Spends Detected!
            </p>
            <p className="text-xs mt-1">
              You still have unpaid commitments this month:&nbsp;
              <span className="font-semibold">{unpaidWarning.join(', ')}</span>.
              Consider clearing these before discretionary spending.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {showAddCategory ? (
          <div className="p-4 rounded-xl border-2" style={{ background: 'rgba(237,246,249,0.5)', borderColor: 'var(--pearlAqua)' }}>
            <label className="block text-sm font-extrabold mb-3" style={{ color: 'var(--stormyTeal)' }}>
              ✨ Create a Custom Category
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                className="flex-1 px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all"
                style={inputStyle}
                placeholder="e.g. Gym, Subscriptions…"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={savingCategory || !newCategoryInput.trim()}
                className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background: 'var(--stormyTeal)' }}
              >
                {savingCategory ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddCategory(false); setNewCategoryInput(''); }}
                className="px-6 py-3 rounded-xl text-sm font-bold transition-all border-2"
                style={{ background: 'white', color: 'var(--stormyTeal)', borderColor: 'var(--pearlAqua)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--stormyTeal)' }}>
                Product / Service
              </label>
          <input
            type="text"
            value={productService}
            onChange={(e) => setProductService(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all"
            style={inputStyle}
            placeholder="What did you buy?"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--stormyTeal)' }}>
              Amount (₹)
            </label>
            <input
              type="number"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all"
              style={inputStyle}
              placeholder="₹0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--stormyTeal)' }}>
              Category
            </label>
            <div className="flex gap-2 relative">
              <div className="flex-1 relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full h-full px-4 py-3 rounded-xl border-2 text-sm text-left flex items-center justify-between transition-all"
                  style={inputStyle}
                >
                  <span className="truncate">{category}</span>
                  <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0 ml-2" />
                </button>
                
                {dropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div 
                      className="absolute left-0 right-0 mt-2 py-2 rounded-xl border-2 shadow-xl z-20 max-h-60 overflow-y-auto"
                      style={{ background: 'white', borderColor: 'var(--pearlAqua)' }}
                    >
                      {allCategories.map((c) => {
                        const isDeletable = c !== 'Add new';
                        return (
                          <div 
                            key={c}
                            className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors group cursor-pointer"
                            onClick={() => {
                              setCategory(c);
                              setDropdownOpen(false);
                            }}
                          >
                            <span className="text-sm font-medium" style={{ color: 'var(--stormyTeal)' }}>{c}</span>
                            {isDeletable && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCategory(c);
                                }}
                                title="Delete custom category"
                                className="p-1.5 rounded-lg transition-all hover:bg-red-50 text-red-500 opacity-60 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowAddCategory(true)}
                title="Add custom category"
                className="w-11 h-11 flex items-center justify-center rounded-xl border-2 flex-shrink-0 transition-all hover:scale-105"
                style={{
                  borderColor: 'var(--pearlAqua)',
                  background: 'rgba(237,246,249,0.8)',
                  color: 'var(--stormyTeal)',
                }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--stormyTeal)' }}>
            Source of Payment
          </label>
          <div className="flex flex-wrap gap-2">
            {allPaymentSources.map((src) => {
              const isDeletable = src !== 'Add new';
              return (
              <div key={src} className="relative group">
                <button
                  type="button"
                  onClick={() => setSourceOfPayment(src)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2"
                  style={
                    sourceOfPayment === src
                      ? { background: 'var(--stormyTeal)', color: 'white', borderColor: 'var(--stormyTeal)' }
                      : { background: 'rgba(237,246,249,0.7)', color: 'var(--stormyTeal)', borderColor: 'var(--pearlAqua)' }
                  }
                >
                  {src === 'GPay' ? '🟢' :
                    src === 'Paytm' ? '🔵' :
                      src === 'PhonePe' ? '🟣' :
                        src === 'Cash' ? '💵' :
                          src === 'Card' ? '💳' :
                            src === 'Add new' ? '📝' : '💰'} {src}
                </button>
                {isDeletable && (
                  <button
                    type="button"
                    onClick={() => deletePaymentSource(src)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )})}
          </div>

          {sourceOfPayment === 'Add new' && (
            <input
              type="text"
              value={sourceOfPaymentOther}
              onChange={(e) => setSourceOfPaymentOther(e.target.value)}
              className="w-full mt-3 px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all"
              style={inputStyle}
              placeholder="Enter payment source"
              required
            />
          )}
        </div>

        {/* Rest of the component remains the same */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--stormyTeal)' }}>
            Your Mood Before Purchase
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {MOODS.map((m) => {
              const Icon = m.icon;
              const isSelected = mood === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all border-2"
                  style={{
                    borderColor: isSelected ? m.color : 'var(--pearlAqua)',
                    background: isSelected ? `${m.color}18` : 'rgba(237,246,249,0.5)',
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: m.color }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--stormyTeal)' }}>
                    {m.value}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--stormyTeal)' }}>
            Why did you make this purchase?
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all resize-none"
            style={inputStyle}
            placeholder="Be honest with yourself…"
            rows={3}
            required
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl border text-sm" style={{ background: '#fff0ed', borderColor: 'var(--tangerineDream)', color: '#c0392b' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl border text-sm" style={{ background: '#ecfdf5', borderColor: '#6ee7b7', color: '#065f46' }}>
            ✅ Entry logged successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl font-extrabold text-white text-sm transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, var(--stormyTeal), var(--pearlAqua))' }}
        >
          {loading ? 'Logging…' : '🛡️ Audit This Purchase'}
        </button>
          </>
        )}
      </form>
    </div>
  );
}