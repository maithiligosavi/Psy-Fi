import { useState, useEffect } from 'react';
import {
  collection, addDoc,
  doc, onSnapshot,
} from 'firebase/firestore';
import { db, FixedRule, AuditEntry } from '../lib/firebase';
import { analyseEntry } from '../lib/insightEngine';
import { useAuth } from '../hooks/useAuth';
import {
  Smile, Meh, Frown, TrendingDown, TrendingUp,
  AlertTriangle, ShieldCheck,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const MOODS = [
  { value: 'Happy',    icon: Smile,        color: '#10b981' },
  { value: 'Neutral',  icon: Meh,          color: '#f59e0b' },
  { value: 'Sad',      icon: Frown,        color: '#60a5fa' },
  { value: 'Stressed', icon: TrendingDown, color: '#ef4444' },
  { value: 'Excited',  icon: TrendingUp,   color: '#a855f7' },
  { value: 'Bored',    icon: Meh,          color: '#94a3b8' },
];

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
  const [amount, setAmount]                 = useState('');
  const [category, setCategory]             = useState('');
  const [reason, setReason]                 = useState('');
  const [mood, setMood]                     = useState('Neutral');
  const [sourceOfPayment, setSourceOfPayment]           = useState('');
  const [sourceOfPaymentOther, setSourceOfPaymentOther] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [unpaidWarning, setUnpaidWarning] = useState<string[]>([]);

  // ── Global settings (categories + payment sources) ────────────────────────
  const [allCategories, setAllCategories]         = useState<string[]>([]);
  const [allPaymentSources, setAllPaymentSources] = useState<string[]>([]);
  const [settingsLoading, setSettingsLoading]     = useState(true);

  // ── Real-time listener on global_settings ────────────────────────────────
  useEffect(() => {
    const globalRef = doc(db, 'global_settings', 'dropdown_options');
    const unsub = onSnapshot(
      globalRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const cats: string[]    = Array.isArray(data.categories)      ? data.categories      : [];
          const srcs: string[]    = Array.isArray(data.payment_sources) ? data.payment_sources : [];
          setAllCategories(cats);
          setAllPaymentSources(srcs);
          // Set sensible defaults for controlled selects
          setCategory((prev) => (prev && cats.includes(prev) ? prev : cats[0] ?? ''));
          setSourceOfPayment((prev) => (prev && srcs.includes(prev) ? prev : srcs[0] ?? ''));
        } else {
          setAllCategories([]);
          setAllPaymentSources([]);
        }
        setSettingsLoading(false);
      },
      (err) => {
        console.error('Failed to load global settings:', err);
        setSettingsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ── Unpaid fixed-spend check — pure, in-memory, no network call ───────────
  const checkUnpaidFixed = () => {
    if (!user || fixedRules.length === 0) return;
    const now       = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const paidThisMonth = auditEntries
      .filter((e) => e.purchase_date.startsWith(monthYear))
      .map((e) => e.product_service?.toLowerCase() ?? '');
    const unpaid = fixedRules.filter(
      (r) => !paidThisMonth.some((p) => p.includes(r.expense_name.toLowerCase()))
    );
    setUnpaidWarning(unpaid.map((r) => r.expense_name));
  };

  // Re-evaluate warning whenever entries or rules change via onSnapshot
  useEffect(() => {
    checkUnpaidFixed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditEntries, fixedRules]);



  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const finalCategory = category.trim();
    const finalSource   =
      sourceOfPayment === 'Other' ? sourceOfPaymentOther.trim() : sourceOfPayment;

    if (sourceOfPayment === 'Other' && !finalSource) {
      setError('Please enter a custom payment source.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Run the Psychological Insights Engine
      const insight = analyseEntry({
        mood,
        spending_type: undefined,
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
      setSourceOfPayment(allPaymentSources[0] ?? '');
      setSourceOfPaymentOther('');
      setTimeout(() => setSuccess(false), 3000);
      onEntryAdded();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background:  'rgba(237,246,249,0.8)',
    borderColor: 'var(--pearlAqua)',
    color:       'var(--stormyTeal)',
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (settingsLoading) {
    return (
      <div className="rounded-2xl p-6 shadow-lg border flex items-center justify-center min-h-[200px]" style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--pearlAqua)' }}>Loading settings…</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-6 shadow-lg border"
      style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
    >
      {/* Header */}
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

      {/* Unpaid Fixed Spend Warning */}
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

        {/* Product / Service */}
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

        {/* Amount + Category */}
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
            {allCategories.length === 0 ? (
              <p className="text-xs px-4 py-3 rounded-xl border-2" style={{ color: 'var(--pearlAqua)', borderColor: 'var(--pearlAqua)', background: 'rgba(237,246,249,0.8)' }}>
                No categories configured yet. Ask an admin to add some.
              </p>
            ) : (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all"
                style={inputStyle}
                required
              >
                {allCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Source of Payment */}
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

        {/* Mood Picker */}
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

        {/* Reason */}
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

        {/* Error / Success */}
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
