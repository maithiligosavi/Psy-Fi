import { AuditEntry, FixedRule } from '../lib/firebase';
import { Brain } from 'lucide-react';

interface ReportsDashboardProps {
  entries: AuditEntry[];
  fixedRules: FixedRule[];
}

/**
 * ReportsDashboard — placeholder for the spending reports feature.
 * Shows a coming-soon card styled consistently with the rest of the app.
 * Replace this component with real report content as the feature develops.
 */
export default function ReportsDashboard({ entries, fixedRules }: ReportsDashboardProps) {
  const totalSpent = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  const categoryMap: Record<string, number> = {};
  for (const e of entries) {
    categoryMap[e.spending_category] = (categoryMap[e.spending_category] ?? 0) + Number(e.amount);
  }
  const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  const fixedTotal  = fixedRules.reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div
      className="rounded-2xl p-6 shadow-md border"
      style={{ background: 'white', borderColor: 'rgba(131,197,190,0.35)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
          style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}
        >
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold" style={{ color: 'var(--stormyTeal)' }}>
            Spending Reports
          </h2>
          <p className="text-sm" style={{ color: 'var(--pearlAqua)' }}>
            Quick summary of your financial behaviour
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Entries', value: entries.length },
          { label: 'Top Category', value: topCategory },
          { label: 'Fixed / mo', value: `₹${fixedTotal.toLocaleString('en-IN')}` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl p-3 text-center border"
            style={{ background: 'var(--aliceBlue)', borderColor: 'rgba(131,197,190,0.3)' }}
          >
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--pearlAqua)' }}>
              {label}
            </div>
            <div className="text-sm font-extrabold truncate" style={{ color: 'var(--stormyTeal)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div
        className="rounded-xl p-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, var(--stormyTeal), #004d57)', color: 'white' }}
      >
        <span className="text-sm font-semibold opacity-80">Total Logged Spend</span>
        <span className="text-xl font-extrabold">
          ₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>
      </div>

      <p className="mt-3 text-xs text-center" style={{ color: 'var(--pearlAqua)' }}>
        📊 Detailed weekly &amp; monthly reports coming soon
      </p>
    </div>
  );
}
