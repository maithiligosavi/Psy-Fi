import { useState } from 'react';
import { AuditEntry, formatINR } from '../lib/firebase';
import { analyseEntry } from '../lib/insightEngine';
import {
  History, TrendingUp, AlertCircle, Sparkles,
  LayoutList, LayoutGrid, Brain, Lightbulb, ShieldAlert, ShieldCheck,
} from 'lucide-react';

interface BehavioralHistoryProps {
  entries: AuditEntry[];
  loading?: boolean;
}

interface FlipCardProps {
  entry: AuditEntry;
}

const PAYMENT_EMOJI: Record<string, string> = {
  GPay: '🟢', Paytm: '🔵', PhonePe: '🟣', Cash: '💵', Card: '💳',
};

const MOOD_EMOJI: Record<string, string> = {
  Happy: '😊', Neutral: '😐', Sad: '😢', Stressed: '😤', Excited: '🤩', Bored: '😑',
};

// ─── Risk styling ──────────────────────────────────────────────────────────────

function getRiskStyle(risk?: string) {
  if (risk === 'High')   return { color: 'var(--tangerineDream)', bg: '#fff7ed', border: 'var(--tangerineDream)', label: 'High Risk' };
  if (risk === 'Medium') return { color: '#d97706',               bg: '#fffbeb', border: '#fbbf24',             label: 'Medium Risk' };
  return                        { color: 'var(--stormyTeal)',      bg: '#f0fdf4', border: 'var(--pearlAqua)',    label: 'Low Risk' };
}

function RiskIcon({ risk }: { risk?: string }) {
  if (risk === 'High')   return <ShieldAlert   className="w-4 h-4" style={{ color: 'var(--tangerineDream)' }} />;
  if (risk === 'Medium') return <ShieldAlert   className="w-4 h-4" style={{ color: '#d97706' }} />;
  return                        <ShieldCheck   className="w-4 h-4" style={{ color: 'var(--stormyTeal)' }} />;
}

// ─── Flip Card ─────────────────────────────────────────────────────────────────

function FlipCard({ entry }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Use DB-stored insight when available, otherwise compute on-the-fly (legacy entries)
  const insight = entry.insight_summary ?? analyseEntry({
    mood: entry.mood,
    spending_type: entry.spending_type,
    amount: entry.amount,
    reason: entry.reason,
    spending_category: entry.spending_category,
  }).summary;

  const triggers: string[] = entry.insight_triggers ?? [];
  const risk    = entry.insight_risk;
  const reco    = entry.insight_recommendation;
  const rStyle  = getRiskStyle(risk);

  return (
    <div className="relative h-52 cursor-pointer perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>

        {/* ── Front ── */}
        <div className="absolute w-full h-full backface-hidden">
          <div
            className="h-full rounded-xl p-4 border-2 hover:shadow-md transition-all flex flex-col justify-between"
            style={{ background: 'white', borderColor: 'rgba(131,197,190,0.4)' }}
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate" style={{ color: 'var(--stormyTeal)' }}>
                    {entry.product_service}
                  </h4>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--pearlAqua)' }}>
                    {entry.spending_category}
                  </p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <div className="text-lg font-extrabold" style={{ color: 'var(--stormyTeal)' }}>
                    {formatINR(entry.amount)}
                  </div>
                  {entry.spending_type && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={
                        entry.spending_type === 'Need'
                          ? { background: '#dcfce7', color: '#166534' }
                          : { background: '#fff7ed', color: '#9a3412' }
                      }
                    >
                      {entry.spending_type}
                    </span>
                  )}
                </div>
              </div>

              {/* Inline insight summary teaser */}
              {insight && (
                <div
                  className="mt-2 px-3 py-2 rounded-lg text-xs font-medium flex items-start gap-2"
                  style={{ background: `${rStyle.bg}`, border: `1px solid ${rStyle.border}80`, color: rStyle.color }}
                >
                  <RiskIcon risk={risk} />
                  <span className="leading-snug">{insight}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs mt-2">
              <span style={{ color: '#94a3b8' }}>{MOOD_EMOJI[entry.mood] || '😶'} {entry.mood}</span>
              <span style={{ color: '#94a3b8' }}>{PAYMENT_EMOJI[entry.source_of_payment] || '💸'} {entry.source_of_payment}</span>
              <span style={{ color: '#94a3b8' }} className="ml-auto">
                {new Date(entry.purchase_date).toLocaleDateString('en-IN')}
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--pearlAqua)' }}>Tap for deep analysis →</span>
            </div>
          </div>
        </div>

        {/* ── Back (full insight) ── */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180">
          <div
            className="h-full rounded-xl p-4 border-2 flex flex-col overflow-hidden"
            style={{ background: rStyle.bg, borderColor: rStyle.border }}
          >
            {/* Header */}
            <div className="flex items-start gap-2 mb-3">
              <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: rStyle.color }} />
              <div>
                <h4 className="font-bold text-sm" style={{ color: rStyle.color }}>
                  Psychological Analysis
                </h4>
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-bold mt-0.5"
                  style={{ background: rStyle.color, color: 'white', lineHeight: '1.4' }}
                >
                  {rStyle.label}
                </span>
              </div>
            </div>

            {/* Triggers */}
            {triggers.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {triggers.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(0,0,0,0.07)', color: rStyle.color }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Recommendation */}
            {reco && (
              <div className="flex items-start gap-1.5 mt-1 flex-1">
                <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: rStyle.color }} />
                <p className="text-xs leading-snug" style={{ color: 'var(--stormyTeal)' }}>
                  {reco}
                </p>
              </div>
            )}

            {/* Reason quote */}
            <div className="mt-2 pt-2 border-t text-xs italic" style={{ borderColor: `${rStyle.border}60`, color: '#64748b' }}>
              "{entry.reason}"
            </div>

            <div className="text-xs font-medium text-right mt-1" style={{ color: 'var(--pearlAqua)' }}>
              ← Tap to flip back
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── List Row ──────────────────────────────────────────────────────────────────

function ListRow({ entry, index }: { entry: AuditEntry; index: number }) {
  const rStyle = getRiskStyle(entry.insight_risk);

  return (
    <div
      className="grid gap-2 px-3 py-2.5 rounded-xl border transition-all hover:shadow-sm"
      style={{
        gridTemplateColumns: '2fr 0.9fr 0.8fr 0.65fr 0.7fr 0.65fr',
        background: index % 2 === 0 ? 'rgba(237,246,249,0.4)' : 'white',
        borderColor: 'rgba(131,197,190,0.25)',
      }}
    >
      {/* Product + inline insight teaser */}
      <div className="min-w-0">
        <div className="text-xs font-bold truncate" style={{ color: 'var(--stormyTeal)' }}>
          {entry.product_service}
        </div>
        <div className="text-xs truncate" style={{ color: '#94a3b8' }}>{entry.spending_category}</div>
        {entry.insight_summary && (
          <div className="text-xs mt-0.5 truncate font-medium" style={{ color: rStyle.color }}>
            ⚡ {entry.insight_summary.split(' — ')[0]}
          </div>
        )}
      </div>
      {/* Amount */}
      <div className="text-xs font-extrabold self-center" style={{ color: rStyle.color }}>
        {formatINR(entry.amount)}
      </div>
      {/* Date */}
      <div className="text-xs self-center" style={{ color: '#64748b' }}>
        {new Date(entry.purchase_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
      </div>
      {/* Mood */}
      <div className="text-xs self-center" style={{ color: '#64748b' }}>
        {MOOD_EMOJI[entry.mood] || '😶'} {entry.mood}
      </div>
      {/* Payment */}
      <div className="text-xs self-center truncate" style={{ color: '#64748b' }}>
        {PAYMENT_EMOJI[entry.source_of_payment] || '💸'} {entry.source_of_payment}
      </div>
      {/* Risk badge */}
      <div className="self-center">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold inline-block"
          style={{ background: rStyle.bg, color: rStyle.color, border: `1px solid ${rStyle.border}80` }}
        >
          {rStyle.label}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function BehavioralHistory({ entries, loading = false }: BehavioralHistoryProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const totalSpent  = entries.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const entryCount  = entries.length;
  const highRisk    = entries.filter((e) => e.insight_risk === 'High').length;

  return (
    <div
      className="rounded-2xl p-6 shadow-lg border"
      style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--stormyTeal), var(--pearlAqua))' }}
          >
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: 'var(--stormyTeal)' }}>
              Behavioural History
            </h2>
            <p className="text-sm" style={{ color: 'var(--pearlAqua)' }}>
              {viewMode === 'cards' ? 'Tap cards to reveal full psychological analysis' : 'Flat list with AI-generated risk scores'}
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div
          className="flex rounded-xl overflow-hidden border flex-shrink-0"
          style={{ borderColor: 'rgba(131,197,190,0.4)' }}
        >
          {(['cards', 'list'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              title={m === 'cards' ? 'Card view' : 'List view'}
              className="px-3 py-2 flex items-center gap-1.5 text-xs font-semibold transition-all"
              style={
                viewMode === m
                  ? { background: 'var(--stormyTeal)', color: 'white' }
                  : { background: 'rgba(237,246,249,0.8)', color: 'var(--stormyTeal)' }
              }
            >
              {m === 'cards' ? <LayoutGrid className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
              <span className="hidden sm:inline" style={{ textTransform: 'capitalize' }}>{m}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl p-4 border" style={{ background: 'rgba(0,109,119,0.06)', borderColor: 'rgba(131,197,190,0.4)' }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--stormyTeal)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--pearlAqua)' }}>Total Spent</span>
          </div>
          <div className="text-xl font-extrabold" style={{ color: 'var(--stormyTeal)' }}>
            {formatINR(totalSpent)}
          </div>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: '#fff7ed', borderColor: '#fdba74' }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4" style={{ color: 'var(--tangerineDream)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--tangerineDream)' }}>Entries</span>
          </div>
          <div className="text-xl font-extrabold" style={{ color: 'var(--tangerineDream)' }}>
            {entryCount}
          </div>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: highRisk > 0 ? '#fff1f2' : '#f0fdf4', borderColor: highRisk > 0 ? '#fca5a5' : '#86efac' }}>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4" style={{ color: highRisk > 0 ? '#ef4444' : 'var(--stormyTeal)' }} />
            <span className="text-xs font-semibold" style={{ color: highRisk > 0 ? '#ef4444' : 'var(--stormyTeal)' }}>
              High-Risk
            </span>
          </div>
          <div className="text-xl font-extrabold" style={{ color: highRisk > 0 ? '#ef4444' : 'var(--stormyTeal)' }}>
            {highRisk}
          </div>
        </div>
      </div>

      {/* Entries */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-10 text-sm font-medium" style={{ color: 'var(--pearlAqua)' }}>
          <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Updating history…
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-10 text-sm font-medium" style={{ color: 'var(--pearlAqua)' }}>
          No spending history yet. Start auditing your purchases! 🌱
        </div>
      ) : viewMode === 'cards' ? (
        <div className="space-y-3 max-h-[540px] overflow-y-auto pr-2 custom-scrollbar">
          {entries.map((entry) => <FlipCard key={entry.id} entry={entry} />)}
        </div>
      ) : (
        <div className="max-h-[540px] overflow-y-auto pr-1 custom-scrollbar">
          {/* List header */}
          <div
            className="grid gap-2 px-3 py-2 rounded-xl mb-2 text-xs font-bold uppercase tracking-wide"
            style={{
              gridTemplateColumns: '2fr 0.9fr 0.8fr 0.65fr 0.7fr 0.65fr',
              background: 'var(--stormyTeal)', color: 'white',
            }}
          >
            <div>Product / Service</div>
            <div>Amount</div>
            <div>Date</div>
            <div>Mood</div>
            <div>Payment</div>
            <div>Risk</div>
          </div>
          <div className="space-y-1">
            {entries.map((entry, i) => <ListRow key={entry.id} entry={entry} index={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}
