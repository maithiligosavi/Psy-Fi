import { useState } from 'react';
import { AuditEntry, formatINR } from '../lib/firebase';
import { History, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';

interface BehavioralHistoryProps {
  entries: AuditEntry[];
}

interface FlipCardProps {
  entry: AuditEntry;
}

const PAYMENT_EMOJI: Record<string, string> = {
  GPay: '🟢', Paytm: '🔵', PhonePe: '🟣', Cash: '💵', Card: '💳',
};

function FlipCard({ entry }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const getInsight = (entry: AuditEntry) => {
    const insights: string[] = [];
    if (entry.mood === 'Stressed' && entry.spending_type === 'Want') insights.push('Stress spending detected');
    if (entry.mood === 'Stressed' && entry.amount > 2000)           insights.push('High stress spending');
    if (entry.mood === 'Sad' && entry.amount > 1000)                insights.push('Potential revenge spending');
    if (entry.mood === 'Bored' && entry.spending_type === 'Want')   insights.push('Boredom-driven impulse');
    if (entry.mood === 'Bored' && entry.amount > 1000)              insights.push('Boredom-driven spending');
    if (entry.spending_type === 'Want' && entry.amount > 5000)      insights.push('High-value impulse purchase');
    if (entry.reason.toLowerCase().includes('deserve'))             insights.push('Emotional justification pattern');
    if (entry.mood === 'Excited' && entry.spending_type === 'Want') insights.push('Excitement-driven spending');
    if (entry.mood === 'Excited' && entry.amount > 3000)            insights.push('Excitement-driven high spend');
    return insights.length > 0 ? insights.join(' • ') : 'Rational purchase behaviour';
  };

  const getRisk = (entry: AuditEntry) => {
    const negativeMood = entry.mood === 'Stressed' || entry.mood === 'Sad' || entry.mood === 'Bored';
    if (negativeMood && (entry.spending_type === 'Want' || entry.amount > 2000)) {
      return { level: 'High Risk', color: 'var(--tangerineDream)', bg: '#fff7ed', border: 'var(--tangerineDream)' };
    }
    if ((entry.spending_type === 'Want' && entry.amount > 2000) || (negativeMood && entry.amount > 1000)) {
      return { level: 'Medium Risk', color: '#d97706', bg: '#fffbeb', border: '#fbbf24' };
    }
    return { level: 'Low Risk', color: 'var(--stormyTeal)', bg: '#f0fdf4', border: 'var(--pearlAqua)' };
  };

  const insight = getInsight(entry);
  const risk = getRisk(entry);

  return (
    <div className="relative h-44 cursor-pointer perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front */}
        <div className="absolute w-full h-full backface-hidden">
          <div
            className="h-full rounded-xl p-4 border-2 hover:shadow-md transition-all"
            style={{ background: 'white', borderColor: 'rgba(131,197,190,0.4)' }}
          >
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

            <div className="flex items-center gap-3 text-xs mt-2">
              <span style={{ color: '#94a3b8' }}>
                😶 {entry.mood}
              </span>
              <span style={{ color: '#94a3b8' }}>
                {PAYMENT_EMOJI[entry.source_of_payment] || '💸'} {entry.source_of_payment}
              </span>
              <span style={{ color: '#94a3b8' }} className="ml-auto">
                {new Date(entry.purchase_date).toLocaleDateString('en-IN')}
              </span>
            </div>

            <div className="absolute bottom-2 right-3 text-xs font-medium" style={{ color: 'var(--pearlAqua)' }}>
              Tap to analyse →
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180">
          <div
            className="h-full rounded-xl p-4 border-2"
            style={{ background: risk.bg, borderColor: risk.border }}
          >
            <div className="flex items-start gap-2 mb-3">
              <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: risk.color }} />
              <div>
                <h4 className="font-bold text-sm" style={{ color: risk.color }}>
                  Psychological Analysis
                </h4>
                <p className="text-xs font-semibold" style={{ color: risk.color }}>{risk.level}</p>
              </div>
            </div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--stormyTeal)' }}>{insight}</p>
            <div className="text-xs italic" style={{ color: '#64748b' }}>
              "{entry.reason}"
            </div>
            <div className="absolute bottom-2 right-3 text-xs font-medium" style={{ color: 'var(--pearlAqua)' }}>
              ← Tap to flip back
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BehavioralHistory({ entries }: BehavioralHistoryProps) {
  const totalSpent   = entries.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
  const entryCount   = entries.length;

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
          <History className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: 'var(--stormyTeal)' }}>
            Behavioural History
          </h2>
          <p className="text-sm" style={{ color: 'var(--pearlAqua)' }}>
            Tap cards to reveal psychological insights
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
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
      </div>

      {/* Entries */}
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
        {entries.length === 0 ? (
          <div className="text-center py-10 text-sm font-medium" style={{ color: 'var(--pearlAqua)' }}>
            No spending history yet. Start auditing your purchases! 🌱
          </div>
        ) : (
          entries.map((entry) => <FlipCard key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}
