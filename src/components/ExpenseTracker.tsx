import { useState, useEffect } from 'react';
import {
  collection, addDoc,
  doc, getDoc, setDoc, arrayUnion,
} from 'firebase/firestore';
import { db, FixedRule, AuditEntry } from '../lib/firebase';
import { analyseEntry } from '../lib/insightEngine';
import { useAuth } from '../hooks/useAuth';
import {
  Smile, Meh, Frown, TrendingDown, TrendingUp,
  AlertTriangle, ShieldCheck, Plus, X,
} from 'lucide-react';

// Constants 

const MOODS = [
  { value: 'Happy',    icon: Smile,        color: '#10b981' },
  { value: 'Neutral',  icon: Meh,          color: '#f59e0b' },
  { value: 'Sad',      icon: Frown,        color: '#60a5fa' },
  { value: 'Stressed', icon: TrendingDown, color: '#ef4444' },
  { value: 'Excited',  icon: TrendingUp,   color: '#a855f7' },
  { value: 'Bored',    icon: Meh,          color: '#94a3b8' },
];

const DEFAULT_CATEGORIES = [
  'Food & Dining', 'Shopping', 'Travel', 'Entertainment',
  'Healthcare', 'Bills & Utilities', 'Education', 'Other',
];

const DEFAULT_PAYMENT_SOURCES = ['GPay', 'Paytm', 'PhonePe', 'Cash', 'Card', 'Other'];

// Types 

interface ExpenseTrackerProps {
  onEntryAdded: () => void;
  fixedRules: FixedRule[];
  auditEntries: AuditEntry[];
}

// Component

<<<<<<< HEAD:src/components/Auditor.tsx
export default function Auditor({ onEntryAdded, fixedRules, auditEntries }: AuditorProps) {
=======
export default function ExpenseTracker({ onEntryAdded, fixedRules }: ExpenseTrackerProps) {
>>>>>>> 53801790df4678f66c94bcc5dacc121b6c722778:src/components/ExpenseTracker.tsx
  const { user } = useAuth();

  // ── Form state ───────────────────────────────────────────────────────────
  const [productService, setProductService]   = useState('');
  const [amount, setAmount]                   = useState('');
  const [category, setCategory]               = useState('Food & Dining');
  const [reason, setReason]                   = useState('');
  const [mood, setMood]                       = useState('Neutral');
  const [sourceOfPayment, setSourceOfPayment] = useState('GPay');
  const [sourceOfPaymentOther, setSourceOfPaymentOther] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [success, setSuccess]                 = useState(false);
  const [unpaidWarning, setUnpaidWarning]     = useState<string[]>([]);

  //  Dynamic categories
  const [allCategories, setAllCategories]         = useState<string[]>(DEFAULT_CATEGORIES);
  const [showAddCategory, setShowAddCategory]     = useState(false);
  const [newCategoryInput, setNewCategoryInput]   = useState('');
  const [savingCategory, setSavingCategory]       = useState(false);

  // Dynamic payment sources 
  const [allPaymentSources, setAllPaymentSources] = useState<string[]>(DEFAULT_PAYMENT_SOURCES);

  //Load user settings (custom categories + custom payment sources) 
  useEffect(() => {
    if (!user) return;
    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, 'user_settings', user.uid);
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.custom_categories?.length) {
            setAllCategories([
              ...DEFAULT_CATEGORIES.slice(0, -1), // all except "Other"
              ...data.custom_categories.filter(
                (c: string) => !DEFAULT_CATEGORIES.includes(c)
              ),
              'Other', // keep "Other" at end
            ]);
          }
          if (data.custom_payment_sources?.length) {
            setAllPaymentSources([
              ...DEFAULT_PAYMENT_SOURCES.slice(0, -1), // all except "Other"
              ...data.custom_payment_sources.filter(
                (s: string) => !DEFAULT_PAYMENT_SOURCES.includes(s)
              ),
              'Other', // keep "Other" at end
            ]);
          }
        }
      } catch (err) {
        console.error('Failed to load user settings:', err);
      }
    };
    loadSettings();
  }, [user]);

  //  Unpaid fixed-spend check — now pure, synchronous, and local
  const checkUnpaidFixed = () => {
    if (!user || fixedRules.length === 0) return;
    const now        = new Date();
    const monthYear  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Filter existing entries in memory — no network call!
    const paidThisMonth = auditEntries
      .filter((e: AuditEntry) => e.purchase_date.startsWith(monthYear))
      .map((e: AuditEntry) => e.product_service?.toLowerCase() ?? '');

    const unpaid = fixedRules.filter(
      (r: FixedRule) => !paidThisMonth.some((p: string) => p.includes(r.expense_name.toLowerCase()))
    );
    setUnpaidWarning(unpaid.map((r) => r.expense_name));
  };

  // Keep the warning updated whenever entries or rules change
  useEffect(() => {
    checkUnpaidFixed();
  }, [auditEntries, fixedRules]);

  //  Add custom category 
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
      // Insert before "Other"
      setAllCategories((prev) => {
        const withoutOther = prev.filter((c) => c !== 'Other');
        return [...withoutOther, trimmed, 'Other'];
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

  // Save custom payment source 
  const saveCustomSource = async (value: string) => {
    if (!value || !user) return;
    // Skip if it's already a known source (default or previously saved)
    if (DEFAULT_PAYMENT_SOURCES.includes(value)) return;
    try {
      const settingsRef = doc(db, 'user_settings', user.uid);
      await setDoc(settingsRef, { custom_payment_sources: arrayUnion(value) }, { merge: true });
      // Update local list so the new source appears as a pill button immediately
      setAllPaymentSources((prev) => {
        if (prev.includes(value)) return prev;
        const withoutOther = prev.filter((s) => s !== 'Other');
        return [...withoutOther, value, 'Other'];
      });
    } catch (err) {
      console.error('Failed to save custom payment source:', err);
    }
  };

  //  Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    
    
    const finalCategory: string = category.trim();
    const finalSource: string   =
      sourceOfPayment === 'Other' ? sourceOfPaymentOther.trim() : sourceOfPayment;

    
    if (sourceOfPayment === 'Other' && !finalSource) {
      setError('Please enter a custom payment source.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // No more blocking checkUnpaidFixed() here — the useEffect handles it!

    
      if (sourceOfPayment === 'Other' && finalSource) {
        await saveCustomSource(finalSource);
      }

      
      // ── Run the Psychological Insights Engine ──
      const insight = analyseEntry({
        mood,
        spending_type: undefined,   // spending_type not in form — engine works without it
        amount: parseFloat(amount),
        reason: reason.trim(),
        spending_category: finalCategory,
      });

      await addDoc(collection(db, 'audit_entries'), {
        user_id:                user.uid,
        product_service:        productService.trim(),
        amount:                 parseFloat(amount),
        spending_category:      finalCategory,
        reason:                 reason.trim(),
        mood,
        source_of_payment:      finalSource,
        purchase_date:          new Date().toISOString(),
        created_at:             new Date().toISOString(),
        // Insight fields
        insight_summary:        insight.summary,
        insight_triggers:       insight.triggers,
        insight_risk:           insight.risk,
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
      // Always clear loading — even if saveCustomSource or addDoc threw
      setLoading(false);
    }
  };


  const inputStyle: React.CSSProperties = {
    background:  'rgba(237,246,249,0.8)',
    borderColor: 'var(--pearlAqua)',
    color:       'var(--stormyTeal)',
  };

 
  return (
    <div
      className="rounded-2xl p-6 shadow-lg border"
      style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
    >
      {/* ── Header ── */}
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

      {/* ── Unpaid Fixed Spend Warning ── */}
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

        {/* ── Product / Service ── */}
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

        {/* ── Amount + Category ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Amount */}
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

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--stormyTeal)' }}>
              Category
            </label>
            <div className="flex gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all"
                style={inputStyle}
              >
                {allCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {/* Add category button */}
              <button
                type="button"
                onClick={() => setShowAddCategory((v) => !v)}
                title="Add custom category"
                className="w-11 h-11 flex items-center justify-center rounded-xl border-2 flex-shrink-0 transition-all hover:scale-105"
                style={{
                  borderColor: showAddCategory ? 'var(--stormyTeal)' : 'var(--pearlAqua)',
                  background:  showAddCategory ? 'var(--stormyTeal)' : 'rgba(237,246,249,0.8)',
                  color:       showAddCategory ? 'white' : 'var(--stormyTeal)',
                }}
              >
                {showAddCategory ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>

            {/* Add category inline input */}
            {showAddCategory && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                  className="flex-1 px-3 py-2 rounded-xl border-2 text-sm outline-none transition-all"
                  style={inputStyle}
                  placeholder="e.g. Gym, Subscriptions…"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={savingCategory || !newCategoryInput.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: 'var(--stormyTeal)' }}
                >
                  {savingCategory ? '…' : 'Add'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Source of Payment ── */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--stormyTeal)' }}>
            Source of Payment
          </label>
          <div className="flex flex-wrap gap-2">
            {allPaymentSources.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setSourceOfPayment(src)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2"
                style={
                  sourceOfPayment === src
                    ? { background: 'var(--stormyTeal)', color: 'white', borderColor: 'var(--stormyTeal)' }
                    : { background: 'rgba(237,246,249,0.7)', color: 'var(--stormyTeal)', borderColor: 'var(--pearlAqua)' }
                }
              >
                {src === 'GPay'    ? '🟢' :
                 src === 'Paytm'   ? '🔵' :
                 src === 'PhonePe' ? '🟣' :
                 src === 'Cash'    ? '💵' :
                 src === 'Card'    ? '💳' :
                 src === 'Other'   ? '📝' : '💰'} {src}
              </button>
            ))}
          </div>

          {/* "Other" text input for custom source */}
          {sourceOfPayment === 'Other' && (
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

        {/* ── Mood Picker ── */}
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
                    background:  isSelected ? `${m.color}18` : 'rgba(237,246,249,0.5)',
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

        {/* ── Reason ── */}
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

        {/* ── Error / Success ── */}
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
      </form>
    </div>
  );
}
