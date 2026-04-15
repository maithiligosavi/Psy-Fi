import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, AuditEntry, formatINR } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import {
  Brain, ArrowLeft, GitBranch, Tag, CreditCard,
  RefreshCw, SearchX, Sparkles, Pencil, Trash2, X, Check,
} from 'lucide-react';

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

// ─── Badge ─────────────────────────────────────────────────────────────────────

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

// ─── Edit Modal ────────────────────────────────────────────────────────────────

interface EditModalProps {
  entry: AuditEntry;
  onSave: (updated: Partial<AuditEntry>) => Promise<void>;
  onClose: () => void;
}

function EditModal({ entry, onSave, onClose }: EditModalProps) {
  const [category, setCategory] = useState(entry.spending_category);
  const [payment, setPayment] = useState(entry.source_of_payment);
  const [product, setProduct] = useState(entry.product_service);
  const [amount, setAmount] = useState(String(entry.amount));
  const [date, setDate] = useState(entry.purchase_date);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Custom input toggle
  const [customCat, setCustomCat] = useState(!DEFAULT_CATEGORIES.includes(entry.spending_category));
  const [customPay, setCustomPay] = useState(!DEFAULT_PAYMENT_SOURCES.includes(entry.source_of_payment));

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!product.trim()) return setError('Product / service name is required.');
    if (isNaN(parsedAmount) || parsedAmount <= 0) return setError('Enter a valid amount.');
    if (!category.trim()) return setError('Category is required.');
    if (!payment.trim()) return setError('Payment source is required.');

    setSaving(true);
    setError('');
    try {
      await onSave({
        product_service: product.trim(),
        amount: parsedAmount,
        purchase_date: date,
        spending_category: category.trim(),
        source_of_payment: payment.trim(),
      });
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid rgba(131,197,190,0.5)',
    fontSize: 13,
    color: 'var(--stormyTeal)',
    background: 'rgba(237,246,249,0.6)',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--pearlAqua)',
    marginBottom: 4,
    display: 'block',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden"
        style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: 'linear-gradient(135deg, #006d77)', color: 'white' }}
        >
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            <span className="font-extrabold text-sm">Edit Entry</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Product */}
          <div>
            <label style={labelStyle}>Product / Service</label>
            <input
              style={inputStyle}
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. Netflix subscription"
            />
          </div>

          {/* Amount + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Amount (₹)</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input
                style={inputStyle}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            {customCat ? (
              <div className="flex gap-2">
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Enter custom category"
                  autoFocus
                />
                <button
                  onClick={() => { setCustomCat(false); setCategory(DEFAULT_CATEGORIES[0]); }}
                  className="px-2 py-1 rounded-lg text-xs font-bold transition-all"
                  style={{ background: 'rgba(131,197,190,0.2)', color: 'var(--stormyTeal)', border: '1px solid rgba(131,197,190,0.4)' }}
                >
                  Presets
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  style={{ ...inputStyle, flex: 1 }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={() => { setCustomCat(true); setCategory(''); }}
                  className="px-2 py-1 rounded-lg text-xs font-bold transition-all"
                  style={{ background: 'rgba(168,85,247,0.1)', color: '#9333ea', border: '1px solid rgba(168,85,247,0.3)' }}
                >
                  Custom
                </button>
              </div>
            )}
          </div>

          {/* Payment Source */}
          <div>
            <label style={labelStyle}>Payment Source</label>
            {customPay ? (
              <div className="flex gap-2">
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                  placeholder="Enter custom payment source"
                />
                <button
                  onClick={() => { setCustomPay(false); setPayment(DEFAULT_PAYMENT_SOURCES[0]); }}
                  className="px-2 py-1 rounded-lg text-xs font-bold transition-all"
                  style={{ background: 'rgba(131,197,190,0.2)', color: 'var(--stormyTeal)', border: '1px solid rgba(131,197,190,0.4)' }}
                >
                  Presets
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  style={{ ...inputStyle, flex: 1 }}
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                >
                  {DEFAULT_PAYMENT_SOURCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <button
                  onClick={() => { setCustomPay(true); setPayment(''); }}
                  className="px-2 py-1 rounded-lg text-xs font-bold transition-all"
                  style={{ background: 'rgba(226,149,120,0.15)', color: '#c2410c', border: '1px solid rgba(226,149,120,0.4)' }}
                >
                  Custom
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>⚠️ {error}</p>
          )}
        </div>

        {/* Footer actions */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: 'rgba(131,197,190,0.25)', background: 'rgba(237,246,249,0.4)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105"
            style={{ background: 'rgba(148,163,184,0.12)', color: '#64748b', border: '1px solid rgba(148,163,184,0.3)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 disabled:opacity-60"
            style={{ background: 'var(--stormyTeal)', color: 'white' }}
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteConfirm({ entry, onConfirm, onClose }: {
  entry: AuditEntry;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl border overflow-hidden"
        style={{ background: 'white', borderColor: 'rgba(239,68,68,0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(239,68,68,0.1)' }}
          >
            <Trash2 className="w-6 h-6" style={{ color: '#ef4444' }} />
          </div>
          <h3 className="text-base font-extrabold mb-1" style={{ color: 'var(--stormyTeal)' }}>
            Delete this entry?
          </h3>
          <p className="text-sm mb-1" style={{ color: '#64748b' }}>
            <span className="font-semibold">{entry.product_service}</span>
          </p>
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            This will permanently remove it from Firestore. This cannot be undone.
          </p>
        </div>
        <div
          className="flex gap-2 px-5 pb-5"
        >
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: 'rgba(148,163,184,0.12)', color: '#64748b', border: '1px solid rgba(148,163,184,0.3)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
            style={{ background: '#ef4444', color: 'white' }}
          >
            {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ChangesPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [allEntries, setAllEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'category' | 'payment'>('all');
  const [editTarget, setEditTarget] = useState<AuditEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuditEntry | null>(null);

  // Real-time listener — updates automatically whenever audit_entries changes
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const q = query(
      collection(db, 'audit_entries'),
      where('user_id', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const entries = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as AuditEntry))
          .filter(isChangeEntry)
          .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());
        setAllEntries(entries);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to listen to change entries:', err);
        setLoading(false);
      }
    );

    // Clean up listener when user changes or component unmounts
    return () => unsubscribe();
  }, [user]);

  // ── Edit handler — onSnapshot will sync local state automatically ────────────
  const handleSave = async (updated: Partial<AuditEntry>) => {
    if (!editTarget) return;
    await updateDoc(doc(db, 'audit_entries', editTarget.id), updated);
    // onSnapshot will push the update; no manual state patch needed
  };

  // ── Delete handler ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteDoc(doc(db, 'audit_entries', deleteTarget.id));
    // onSnapshot will remove it from the list automatically
  };

  // Apply secondary filter
  const displayed = allEntries.filter((e) => {
    if (filterType === 'category') return isCustomCategory(e.spending_category);
    if (filterType === 'payment') return isCustomPaymentSource(e.source_of_payment);
    return true;
  });

  const customCatCount = allEntries.filter((e) => isCustomCategory(e.spending_category)).length;
  const customPayCount = allEntries.filter((e) => isCustomPaymentSource(e.source_of_payment)).length;

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--aliceBlue)' }}>

      {/* Modals */}
      {editTarget && (
        <EditModal
          entry={editTarget}
          onSave={handleSave}
          onClose={() => setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          entry={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

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
                  Mindful Finance Expense Tracker
                </p>
              </div>
            </div>

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
                <ArrowLeft className="w-5 h-5" style={{ color: 'var(--almondSilk)' }}
                  onClick={(e) => { e.stopPropagation(); navigate('/'); }} />
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
          style={{ background: 'linear-gradient(135deg, #006d77)', color: 'white' }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <GitBranch className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-extrabold mb-1">Expense Tracker Changes Log</h2>
              <p className="text-sm opacity-80">
                Entries where you added a <strong>custom category</strong> or a <strong>custom payment source</strong> —
                inputs that were not part of the original pre-defined options. You can edit or delete any entry here.
              </p>
            </div>
            <div
              title="Live — updates automatically"
              className="p-2.5 rounded-xl flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-5 grid grid-cols-3 gap-4">
            {[
              { label: 'Total Custom Entries', value: allEntries.length, emoji: '🔖' },
              { label: 'Custom Categories', value: customCatCount, emoji: '🏷️' },
              { label: 'Custom Payment Sources', value: customPayCount, emoji: '💳' },
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
          {([['all', 'All Changes'], ['category', '🏷️ Custom Categories'], ['payment', '💳 Custom Payments']] as const).map(([val, label]) => (
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
              Use the <strong>+ button</strong> in the Expense Tracker's Category field or select{' '}
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
                gridTemplateColumns: '2fr 0.8fr 0.8fr 1fr 1fr 72px',
                background: 'linear-gradient(135deg, #006d77)',
                color: 'white',
              }}
            >
              <div>Product / Service</div>
              <div>Amount</div>
              <div>Date</div>
              <div>Category</div>
              <div>Payment Source</div>
              <div className="text-center">Actions</div>
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: 'rgba(131,197,190,0.18)' }}>
              {displayed.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-2 px-5 py-3.5 items-center transition-all hover:bg-purple-50 group"
                  style={{ gridTemplateColumns: '2fr 0.8fr 0.8fr 1fr 1fr 72px' }}
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

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => setEditTarget(entry)}
                      title="Edit entry"
                      className="p-1.5 rounded-lg transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                      style={{ background: 'rgba(131,197,190,0.15)', border: '1px solid rgba(131,197,190,0.35)' }}
                    >
                      <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--stormyTeal)' }} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(entry)}
                      title="Delete entry"
                      className="p-1.5 rounded-lg transition-all hover:scale-110 opacity-0 group-hover:opacity-100"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                    </button>
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
              <span className="ml-auto opacity-60">Hover a row to edit or delete</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
