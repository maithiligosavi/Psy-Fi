import { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, query, where, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, FixedRule, formatINR } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Calendar, Trash2, Plus, CheckCircle2, Circle } from 'lucide-react';

interface FixedExpensesProps {
  onUpdate: () => void;
}

const CATEGORIES = ['Rent', 'Loan', 'Subscription', 'Insurance', 'Utilities', 'Other'];

const CATEGORY_EMOJI: Record<string, string> = {
  Rent: '🏠', Loan: '🏦', Subscription: '📱', Insurance: '🛡️', Utilities: '⚡', Other: '📋',
};

export default function FixedExpenses({ onUpdate }: FixedExpensesProps) {
  const { user } = useAuth();
  const [rules, setRules] = useState<FixedRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [expenseName, setExpenseName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'Weekly' | 'Monthly'>('Monthly');
  const [dueDay, setDueDay] = useState('1');
  const [category, setCategory] = useState('Rent');

  // ── Real-time listener: rules update instantly without page refresh ──
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'fixed_rules'),
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setRules(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FixedRule)));
    });
    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'fixed_rules'), {
        user_id: user.uid,
        expense_name: expenseName,
        amount: parseFloat(amount),
        frequency,
        due_day: parseInt(dueDay),
        category,
        is_paid: false,
        created_at: new Date().toISOString(),
      });
      // onSnapshot will update `rules` automatically — no manual reload needed
      setExpenseName(''); setAmount(''); setFrequency('Monthly'); setDueDay('1'); setCategory('Rent');
      setShowForm(false);
      onUpdate();
    } catch (err) {
      console.error('Error adding fixed expense:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'fixed_rules', id));
    // onSnapshot handles the UI update automatically
    onUpdate();
  };

  const handleTogglePaid = async (rule: FixedRule) => {
    await updateDoc(doc(db, 'fixed_rules', rule.id), { is_paid: !rule.is_paid });
    // onSnapshot handles the UI update automatically
    onUpdate();
  };

  const totalMonthly = rules.filter(r => r.frequency === 'Monthly').reduce((s, r) => s + parseFloat(r.amount.toString()), 0);
  const totalWeekly  = rules.filter(r => r.frequency === 'Weekly').reduce((s, r)  => s + parseFloat(r.amount.toString()), 0);
  const paidCount    = rules.filter(r => r.is_paid).length;

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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, var(--tangerineDream), #d97706)' }}
          >
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: 'var(--stormyTeal)' }}>
              Fixed Spends
            </h2>
            <p className="text-sm" style={{ color: 'var(--pearlAqua)' }}>
              {paidCount}/{rules.length} paid this period
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-2.5 rounded-xl transition-all hover:scale-105 shadow-md"
          style={{ background: 'var(--stormyTeal)', color: 'white' }}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-3 border" style={{ background: '#fff7ed', borderColor: 'var(--tangerineDream)' }}>
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--tangerineDream)' }}>Monthly Total</div>
          <div className="text-lg font-extrabold" style={{ color: 'var(--tangerineDream)' }}>
            {formatINR(totalMonthly)}
          </div>
        </div>
        <div className="rounded-xl p-3 border" style={{ background: 'rgba(0,109,119,0.05)', borderColor: 'var(--pearlAqua)' }}>
          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--stormyTeal)' }}>Weekly Total</div>
          <div className="text-lg font-extrabold" style={{ color: 'var(--stormyTeal)' }}>
            {formatINR(totalWeekly)}
          </div>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 p-4 rounded-xl space-y-3 border" style={{ background: 'rgba(237,246,249,0.6)', borderColor: 'var(--pearlAqua)' }}>
          <input
            type="text"
            value={expenseName}
            onChange={(e) => setExpenseName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none"
            style={inputStyle}
            placeholder="Expense name (e.g., Netflix, Rent)"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none"
              style={inputStyle}
              placeholder="Amount (₹)"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none"
              style={inputStyle}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as 'Weekly' | 'Monthly')}
              className="w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none"
              style={inputStyle}
            >
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
            <input
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 text-sm outline-none"
              style={inputStyle}
              placeholder="Due day"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-60"
            style={{ background: 'var(--stormyTeal)' }}
          >
            {loading ? 'Adding…' : 'Add Fixed Spend'}
          </button>
        </form>
      )}

      {/* Rules list */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-sm font-medium" style={{ color: 'var(--pearlAqua)' }}>
            No fixed expenses yet. Add your recurring payments! 🧾
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-sm"
              style={{
                background: rule.is_paid ? 'rgba(16,185,129,0.06)' : 'rgba(237,246,249,0.5)',
                borderColor: rule.is_paid ? '#86efac' : 'rgba(131,197,190,0.35)',
              }}
            >
              {/* Left: icon + details */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: 'rgba(226,149,120,0.12)' }}
                >
                  {CATEGORY_EMOJI[rule.category] || '💰'}
                </div>
                <div className="min-w-0">
                  <div
                    className="font-semibold text-sm truncate"
                    style={{
                      color: rule.is_paid ? '#16a34a' : 'var(--stormyTeal)',
                      textDecoration: rule.is_paid ? 'line-through' : 'none',
                    }}
                  >
                    {rule.expense_name}
                  </div>
                  <div className="text-xs flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--pearlAqua)' }}>
                    <span
                      className="px-1.5 py-0.5 rounded-md text-xs font-semibold"
                      style={{ background: 'rgba(131,197,190,0.15)', color: 'var(--stormyTeal)' }}
                    >
                      {rule.category}
                    </span>
                    <span>·</span>
                    <span>{rule.frequency}</span>
                    <span>·</span>
                    <span>Due day {rule.due_day}</span>
                  </div>
                </div>
              </div>

              {/* Right: amount + paid toggle + delete */}
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                <div className="font-bold text-sm" style={{ color: 'var(--tangerineDream)' }}>
                  {formatINR(parseFloat(rule.amount.toString()))}
                </div>
                {/* Paid toggle */}
                <button
                  onClick={() => handleTogglePaid(rule)}
                  title={rule.is_paid ? 'Mark as unpaid' : 'Mark as paid'}
                  className="p-1.5 rounded-lg transition-all hover:scale-105"
                  style={
                    rule.is_paid
                      ? { background: '#dcfce7', color: '#16a34a' }
                      : { background: 'rgba(131,197,190,0.15)', color: 'var(--pearlAqua)' }
                  }
                >
                  {rule.is_paid
                    ? <CheckCircle2 className="w-4 h-4" />
                    : <Circle className="w-4 h-4" />
                  }
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-1.5 rounded-lg transition-all hover:scale-105"
                  style={{ background: '#fee2e2', color: '#ef4444' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Progress bar if any rules */}
      {rules.length > 0 && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(131,197,190,0.25)' }}>
          <div className="flex justify-between text-xs font-semibold mb-1.5" style={{ color: 'var(--stormyTeal)' }}>
            <span>Payment progress</span>
            <span>{paidCount}/{rules.length} paid</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(131,197,190,0.2)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: rules.length > 0 ? `${(paidCount / rules.length) * 100}%` : '0%',
                background: 'linear-gradient(90deg, var(--stormyTeal), var(--pearlAqua))',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
