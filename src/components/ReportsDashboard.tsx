import { useState, useMemo, useEffect, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, AuditEntry, FixedRule, formatINR, SpendingReport } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { BarChart2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Save } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Period = 'Weekly' | 'Monthly' | 'Annual';

interface ReportsDashboardProps {
  entries: AuditEntry[];
  fixedRules: FixedRule[];
}

interface CategorySlice {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

// ─── Chart Palette ──────────────────────────────────────────────────────────────

const PALETTE = [
  '#006d77', '#83c5be', '#e29578', '#ffddd2', '#10b981',
  '#f59e0b', '#a855f7', '#60a5fa', '#ef4444', '#14b8a6',
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getPeriodBounds(period: Period, offset: 0 | -1): { start: Date; end: Date } {
  const now = new Date();
  if (period === 'Weekly') {
    const day = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - day + offset * 7);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return { start: startOfWeek, end: endOfWeek };
  }
  if (period === 'Monthly') {
    const year = now.getFullYear();
    const month = now.getMonth() + offset;
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
  const year = now.getFullYear() + offset;
  return {
    start: new Date(year, 0, 1, 0, 0, 0, 0),
    end:   new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

/** Returns a stable string key for the current period, e.g. "2026-04" / "2026-W14" / "2026" */
function getPeriodKey(period: Period, start: Date): string {
  if (period === 'Monthly') {
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
  }
  if (period === 'Weekly') {
    // ISO week number
    const jan4 = new Date(start.getFullYear(), 0, 4);
    const week = Math.ceil(((start.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
    return `${start.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  return `${start.getFullYear()}`;
}

function filterEntries(entries: AuditEntry[], start: Date, end: Date): AuditEntry[] {
  return entries.filter((e) => {
    const d = new Date(e.purchase_date);
    return d >= start && d <= end;
  });
}

function buildSlices(entries: AuditEntry[]): CategorySlice[] {
  const totals: Record<string, number> = {};
  let grandTotal = 0;
  entries.forEach((e) => {
    const amt = parseFloat(e.amount.toString());
    totals[e.spending_category] = (totals[e.spending_category] || 0) + amt;
    grandTotal += amt;
  });
  if (grandTotal === 0) return [];
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount], i) => ({
      name,
      amount,
      percentage: (amount / grandTotal) * 100,
      color: PALETTE[i % PALETTE.length],
    }));
}

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────

function DonutChart({ slices, total }: { slices: CategorySlice[]; total: number }) {
  const R = 56, cx = 70, cy = 70;
  const circumference = 2 * Math.PI * R;

  if (slices.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: 140, height: 140 }}>
        <div className="text-center">
          <div className="text-3xl mb-1">🌱</div>
          <div className="text-xs font-medium" style={{ color: 'var(--pearlAqua)' }}>No data</div>
        </div>
      </div>
    );
  }

  let offset = 0;
  const segments = slices.map((s) => {
    const dash = (s.percentage / 100) * circumference;
    const gap  = circumference - dash;
    const seg  = { dash, gap, offset, color: s.color };
    offset += dash;
    return seg;
  });

  return (
    <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(131,197,190,0.15)" strokeWidth="18" />
        {segments.map((seg, i) => (
          <circle
            key={i} cx={cx} cy={cy} r={R} fill="none"
            stroke={seg.color} strokeWidth="18"
            strokeDasharray={`${seg.dash} ${seg.gap}`}
            strokeDashoffset={-seg.offset + circumference * 0.25}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ pointerEvents: 'none' }}>
        <div className="text-xs font-semibold" style={{ color: 'var(--pearlAqua)' }}>Total</div>
        <div className="text-sm font-extrabold leading-tight text-center px-1" style={{ color: 'var(--stormyTeal)' }}>
          {formatINR(total)}
        </div>
      </div>
    </div>
  );
}

// ─── Period Comparison Badge ───────────────────────────────────────────────────

function ComparisonBadge({ current, previous, period }: { current: number; previous: number; period: Period }) {
  if (previous === 0 && current === 0) return null;
  const label = period === 'Weekly' ? 'last week' : period === 'Monthly' ? 'last month' : 'last year';

  if (previous === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
        style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac' }}>
        <TrendingUp className="w-3.5 h-3.5" /> New period
      </div>
    );
  }

  const pct  = ((current - previous) / previous) * 100;
  const up   = pct > 0;
  const flat = Math.abs(pct) < 0.5;

  if (flat) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
        style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #cbd5e1' }}>
        <Minus className="w-3.5 h-3.5" /> Same as {label}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
      style={up
        ? { background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74' }
        : { background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac' }}>
      {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {up ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}% vs {label}
    </div>
  );
}

// ─── Mood Bar ──────────────────────────────────────────────────────────────────

function MoodBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : (count / total) * 100;
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-16 font-medium truncate" style={{ color: 'var(--stormyTeal)' }}>{label}</div>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(131,197,190,0.15)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-6 text-right font-bold" style={{ color: 'var(--stormyTeal)' }}>{count}</div>
    </div>
  );
}

// ─── Save Indicator ────────────────────────────────────────────────────────────

function SaveBadge({ status }: { status: 'idle' | 'saving' | 'saved' }) {
  if (status === 'idle') return null;
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
      style={
        status === 'saving'
          ? { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }
          : { background: 'rgba(16,185,129,0.25)', color: '#6ee7b7', border: '1px solid rgba(110,231,183,0.4)' }
      }
    >
      <Save className="w-3 h-3" />
      {status === 'saving' ? 'Saving…' : 'Saved ✓'}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ReportsDashboard({ entries }: ReportsDashboardProps) {
  const { user } = useAuth();
  const [period, setPeriod]       = useState<Period>('Monthly');
  const [collapsed, setCollapsed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const { start: curStart, end: curEnd }   = useMemo(() => getPeriodBounds(period, 0),  [period]);
  const { start: prevStart, end: prevEnd } = useMemo(() => getPeriodBounds(period, -1), [period]);

  const currentEntries  = useMemo(() => filterEntries(entries, curStart,  curEnd),  [entries, curStart,  curEnd]);
  const previousEntries = useMemo(() => filterEntries(entries, prevStart, prevEnd), [entries, prevStart, prevEnd]);

  const currentTotal  = useMemo(() => currentEntries.reduce((s, e)  => s + parseFloat(e.amount.toString()), 0), [currentEntries]);
  const previousTotal = useMemo(() => previousEntries.reduce((s, e) => s + parseFloat(e.amount.toString()), 0), [previousEntries]);

  const slices = useMemo(() => buildSlices(currentEntries), [currentEntries]);

  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    currentEntries.forEach((e) => { counts[e.mood] = (counts[e.mood] || 0) + 1; });
    return counts;
  }, [currentEntries]);

  const MOOD_COLORS: Record<string, string> = {
    Happy: '#10b981', Neutral: '#f59e0b', Sad: '#60a5fa',
    Stressed: '#ef4444', Excited: '#a855f7', Bored: '#94a3b8',
  };

  const TABS: Period[] = ['Weekly', 'Monthly', 'Annual'];

  const periodLabel = useMemo(() => {
    if (period === 'Weekly') return `${curStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${curEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
    if (period === 'Monthly') return curStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return curStart.getFullYear().toString();
  }, [period, curStart, curEnd]);

  // ── Persist report to Firestore ────────────────────────────────────────────
  const persistReport = useCallback(async () => {
    if (!user || currentEntries.length === 0) return;

    const periodKey  = getPeriodKey(period, curStart);
    const docId      = `${user.uid}_${period}_${periodKey}`;
    const breakdown: Record<string, number> = {};
    currentEntries.forEach((e) => {
      const amt = parseFloat(e.amount.toString());
      breakdown[e.spending_category] = (breakdown[e.spending_category] || 0) + amt;
    });
    const topCategory = slices[0]?.name ?? '';

    const report: SpendingReport = {
      user_id:            user.uid,
      period,
      period_key:         periodKey,
      total_spent:        currentTotal,
      entry_count:        currentEntries.length,
      top_category:       topCategory,
      category_breakdown: breakdown,
      saved_at:           new Date().toISOString(),
    };

    setSaveStatus('saving');
    try {
      await setDoc(doc(db, 'reports', docId), report, { merge: true });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      console.error('Failed to save report:', err);
      setSaveStatus('idle');
    }
  }, [user, period, curStart, currentEntries, currentTotal, slices]);

  // Auto-save whenever the period changes and there is data
  useEffect(() => {
    if (currentEntries.length === 0) return;
    const timer = setTimeout(() => { persistReport(); }, 1200);
    return () => clearTimeout(timer);
  }, [period, currentEntries.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="rounded-2xl shadow-lg border mb-7 overflow-hidden"
      style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-6 py-4 cursor-pointer select-none"
        style={{ background: 'linear-gradient(135deg, var(--stormyTeal) 0%, #004d57 100%)' }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">Spending Reports</h2>
            <p className="text-xs opacity-75 text-white">{periodLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SaveBadge status={saveStatus} />

          {/* Period tabs */}
          <div
            className="flex rounded-xl overflow-hidden border"
            style={{ borderColor: 'rgba(131,197,190,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setPeriod(t)}
                className="px-3 py-1.5 text-xs font-bold transition-all"
                style={
                  period === t
                    ? { background: 'rgba(255,255,255,0.92)', color: 'var(--stormyTeal)' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.75)' }
                }
              >
                {t === 'Weekly' ? 'Week' : t === 'Monthly' ? 'Month' : 'Year'}
              </button>
            ))}
          </div>

          {collapsed
            ? <ChevronDown className="w-5 h-5 text-white opacity-75" />
            : <ChevronUp   className="w-5 h-5 text-white opacity-75" />
          }
        </div>
      </div>

      {/* ── Body ── */}
      {!collapsed && (
        <div className="p-6">
          {currentEntries.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">📊</div>
              <p className="font-semibold text-sm" style={{ color: 'var(--pearlAqua)' }}>
                No spending data for this period yet.
              </p>
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                Log entries via the Auditor to see your report.
              </p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* ── Summary row ── */}
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--pearlAqua)' }}>
                    Total Spent
                  </div>
                  <div className="text-2xl font-extrabold" style={{ color: 'var(--stormyTeal)' }}>
                    {formatINR(currentTotal)}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <ComparisonBadge current={currentTotal} previous={previousTotal} period={period} />
                  {previousTotal > 0 && (
                    <div className="text-xs" style={{ color: '#94a3b8' }}>
                      Previous: {formatINR(previousTotal)} · {currentEntries.length} transactions
                    </div>
                  )}
                </div>
              </div>

              {/* ── Category breakdown ── */}
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <DonutChart slices={slices} total={currentTotal} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--pearlAqua)' }}>
                    Category Breakdown
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {slices.map((s) => (
                      <div key={s.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold truncate pr-2" style={{ color: 'var(--stormyTeal)' }}>
                              {s.name}
                            </span>
                            <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--stormyTeal)' }}>
                              {formatINR(s.amount)}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full w-full overflow-hidden" style={{ background: 'rgba(131,197,190,0.15)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${s.percentage}%`, background: s.color }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-semibold w-10 text-right flex-shrink-0" style={{ color: '#94a3b8' }}>
                          {s.percentage.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Mood distribution ── */}
              {Object.keys(moodCounts).length > 0 && (
                <div>
                  <div className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--pearlAqua)' }}>
                    Mood at Purchase
                  </div>
                  <div className="space-y-2">
                    {Object.entries(moodCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([mood, count]) => (
                        <MoodBar
                          key={mood} label={mood} count={count}
                          total={currentEntries.length} color={MOOD_COLORS[mood] || '#94a3b8'}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* ── Top transactions ── */}
              <div>
                <div className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--pearlAqua)' }}>
                  Top Transactions
                </div>
                <div className="space-y-2">
                  {[...currentEntries]
                    .sort((a, b) => parseFloat(b.amount.toString()) - parseFloat(a.amount.toString()))
                    .slice(0, 5)
                    .map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border"
                        style={{ background: 'rgba(237,246,249,0.5)', borderColor: 'rgba(131,197,190,0.3)' }}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate" style={{ color: 'var(--stormyTeal)' }}>
                            {e.product_service}
                          </div>
                          <div className="text-xs" style={{ color: '#94a3b8' }}>
                            {e.spending_category} · {new Date(e.purchase_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                        <div className="font-bold text-sm ml-3 flex-shrink-0" style={{ color: 'var(--tangerineDream)' }}>
                          {formatINR(parseFloat(e.amount.toString()))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
