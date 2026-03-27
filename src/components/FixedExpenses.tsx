import { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, FixedRule, formatINR } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Calendar, Trash2, Plus, IndianRupee } from 'lucide-react';

interface FixedExpensesProps {
  onUpdate: () => void;
}

const CATEGORIES = ['Rent', 'Loan', 'Subscription', 'Insurance', 'Utilities', 'Other'];

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

  useEffect(() => { if (user) loadRules(); }, [user]);

  const loadRules = async () => {
    if (!user) return;
    const q = query(
      collection(db, 'fixed_rules'),
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );
    const snap = await getDocs(q);
    setRules(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FixedRule)));
  };

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
      setExpenseName(''); setAmount(''); setFrequency('Monthly'); setDueDay('1'); setCategory('Rent');
      setShowForm(false);
      await loadRules();
      onUpdate();
    } catch (err) {
      console.error('Error adding fixed expense:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'fixed_rules', id));
    await loadRules();
    onUpdate();
  };

  const totalMonthly = rules.filter(r => r.frequency === 'Monthly').reduce((s, r) => s + parseFloat(r.amount.toString()), 0);
  const totalWeekly = rules.filter(r => r.frequency === 'Weekly').reduce((s, r) => s + parseFloat(r.amount.toString()), 0);

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
            <p className="text-sm" style={{ color: 'var(--pearlAqua)' }}>Recurring commitments</p>
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
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-sm font-medium" style={{ color: 'var(--pearlAqua)' }}>
            No fixed expenses yet. Add your recurring payments! 🧾
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-sm"
              style={{ background: 'rgba(237,246,249,0.5)', borderColor: 'rgba(131,197,190,0.35)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(226,149,120,0.15)' }}
                >
                  <IndianRupee className="w-4 h-4" style={{ color: 'var(--tangerineDream)' }} />
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--stormyTeal)' }}>
                    {rule.expense_name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--pearlAqua)' }}>
                    {rule.category} • {rule.frequency} • Day {rule.due_day}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-bold text-sm" style={{ color: 'var(--tangerineDream)' }}>
                  {formatINR(parseFloat(rule.amount.toString()))}
                </div>
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
    </div>
  );
}
