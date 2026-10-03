import { useState } from 'react';
import { AuditEntry, FixedRule, formatINR } from '../lib/firebase';
import { Brain, Sparkles, AlertTriangle, Lightbulb, TrendingUp, ShieldAlert, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import {
  generateAIInsightReport,
  type GeminiInsightReport,
  type GeminiServiceError,
} from '../services/geminiInsightService';

interface ReportsDashboardProps {
  entries: AuditEntry[];
  fixedRules: FixedRule[];
}

// ── Health Score Ring ─────────────────────────────────────────────────────────
function HealthScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'At Risk' : 'Critical';

  return (
    <div className="flex flex-col items-center">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} stroke="rgba(131,197,190,0.2)" strokeWidth="10" fill="none" />
        <circle
          cx="48" cy="48" r={radius}
          stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '48px 48px', transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="48" y="44" textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>{score}</text>
        <text x="48" y="58" textAnchor="middle" fontSize="9" fontWeight="600" fill="#94a3b8">{label}</text>
      </svg>
    </div>
  );
}

// ── Severity Badge ────────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: 'Low' | 'Medium' | 'High' }) {
  const styles = {
    Low:    { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    Medium: { bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
    High:   { bg: '#fff1f2', color: '#ef4444', border: '#fca5a5' },
  };
  const s = styles[severity];
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      {severity}
    </span>
  );
}

// ── AI Report Panel ───────────────────────────────────────────────────────────
function AIReportPanel({ report }: { report: GeminiInsightReport }) {
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="mt-5 space-y-4">
      {/* Health Score + Summary */}
      <div className="rounded-xl p-4 border" style={{ background: 'linear-gradient(135deg, rgba(0,109,119,0.05), rgba(131,197,190,0.08))', borderColor: 'rgba(131,197,190,0.4)' }}>
        <div className="flex items-center gap-5">
          <HealthScoreRing score={report.overallHealthScore} />
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--pearlAqua)' }}>
              Financial Health Score
            </div>
            <div className="text-base font-extrabold mb-2" style={{ color: 'var(--stormyTeal)' }}>
              {report.overallHealthLabel}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>
              {report.executiveSummary}
            </p>
          </div>
        </div>
      </div>

      {/* Mood Correlation */}
      <div className="rounded-xl px-4 py-3 border flex items-center gap-3"
        style={{ background: '#fff7ed', borderColor: 'var(--tangerineDream)' }}>
        <Brain className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--tangerineDream)' }} />
        <p className="text-xs font-medium" style={{ color: '#92400e' }}>
          {report.moodSpendingCorrelation}
        </p>
      </div>

      {/* Behavioural Patterns */}
      {report.patterns.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--stormyTeal)' }}>
            Behavioural Patterns
          </h4>
          <div className="space-y-2">
            {report.patterns.map((p, i) => (
              <div key={i} className="rounded-xl p-3 border" style={{ background: 'rgba(237,246,249,0.6)', borderColor: 'rgba(131,197,190,0.3)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold" style={{ color: 'var(--stormyTeal)' }}>{p.pattern}</span>
                  <SeverityBadge severity={p.severity} />
                </div>
                <p className="text-xs" style={{ color: '#64748b' }}>{p.description}</p>
                <p className="text-xs mt-1 font-medium" style={{ color: 'var(--pearlAqua)' }}>↻ {p.frequency}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emotional Triggers */}
      {report.emotionalTriggers.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--stormyTeal)' }}>
            Emotional Triggers
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {report.emotionalTriggers.map((t, i) => (
              <div key={i} className="rounded-xl p-3 border" style={{ background: '#fff1f2', borderColor: '#fca5a5' }}>
                <div className="text-xs font-bold mb-1" style={{ color: '#ef4444' }}>{t.trigger}</div>
                <div className="text-xs" style={{ color: '#64748b' }}>{t.associatedCategories.join(', ')}</div>
                <div className="text-sm font-extrabold mt-1" style={{ color: 'var(--stormyTeal)' }}>{formatINR(t.totalAmount)}</div>
                <div className="text-xs" style={{ color: '#94a3b8' }}>{t.count} purchases</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible: Anomalies + Top Risks + Suggestions */}
      <button
        onClick={() => setShowAll(!showAll)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-semibold transition-all hover:shadow-sm"
        style={{ background: 'rgba(237,246,249,0.8)', borderColor: 'rgba(131,197,190,0.4)', color: 'var(--stormyTeal)' }}
      >
        {showAll ? <><ChevronUp className="w-4 h-4" /> Hide Details</> : <><ChevronDown className="w-4 h-4" /> Show Risks & Suggestions</>}
      </button>

      {showAll && (
        <div className="space-y-4">
          {/* Anomalies */}
          {report.anomalies.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--stormyTeal)' }}>
                Anomalies Detected
              </h4>
              <div className="space-y-2">
                {report.anomalies.map((a, i) => (
                  <div key={i} className="rounded-xl p-3 border" style={{ background: '#fffbeb', borderColor: '#fcd34d' }}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#d97706' }} />
                      <div>
                        <p className="text-xs font-bold" style={{ color: '#92400e' }}>{a.description}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{a.date} · {formatINR(a.amount)}</p>
                        <p className="text-xs mt-1 italic" style={{ color: 'var(--stormyTeal)' }}>💡 {a.recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Risks */}
          {report.topRisks.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--stormyTeal)' }}>
                Top Risks
              </h4>
              <div className="space-y-1.5">
                {report.topRisks.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg"
                    style={{ background: '#fff1f2', color: '#7f1d1d' }}>
                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-500" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Suggestions */}
          {report.actionableSuggestions.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--stormyTeal)' }}>
                Actionable Suggestions
              </h4>
              <div className="space-y-1.5">
                {report.actionableSuggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg"
                    style={{ background: '#f0fdf4', color: '#14532d' }}>
                    <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-xs" style={{ color: '#94a3b8' }}>
        Generated {new Date(report.generatedAt).toLocaleString('en-IN')} · Powered by Gemini
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ReportsDashboard({ entries, fixedRules }: ReportsDashboardProps) {
  const [aiReport, setAiReport] = useState<GeminiInsightReport | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const totalSpent = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  const categoryMap: Record<string, number> = {};
  for (const e of entries) {
    categoryMap[e.spending_category] = (categoryMap[e.spending_category] ?? 0) + Number(e.amount);
  }
  const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  const fixedTotal = fixedRules.reduce((sum, r) => sum + Number(r.amount), 0);

  const handleGenerateReport = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiReport(null);
    try {
      const report = await generateAIInsightReport(entries, fixedRules);
      setAiReport(report);
    } catch (err: unknown) {
      const serviceErr = err as GeminiServiceError;
      setAiError(serviceErr?.message ?? 'An unexpected error occurred. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

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
            Quick summary + AI-powered behavioural analysis
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
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--pearlAqua)' }}>{label}</div>
            <div className="text-sm font-extrabold truncate" style={{ color: 'var(--stormyTeal)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div
        className="rounded-xl p-4 flex items-center justify-between mb-5"
        style={{ background: 'linear-gradient(135deg, var(--stormyTeal), #004d57)', color: 'white' }}
      >
        <span className="text-sm font-semibold opacity-80">Total Logged Spend</span>
        <span className="text-xl font-extrabold">
          ₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* AI Analysis Section */}
      <div className="border-t pt-5" style={{ borderColor: 'rgba(131,197,190,0.25)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: '#a855f7' }} />
            <span className="text-sm font-extrabold" style={{ color: 'var(--stormyTeal)' }}>
              AI Behavioural Analysis
            </span>
          </div>
          {aiReport && (
            <button
              onClick={handleGenerateReport}
              disabled={aiLoading}
              title="Re-generate report"
              className="p-1.5 rounded-lg transition-all hover:scale-105 disabled:opacity-50"
              style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Trigger button */}
        {!aiReport && !aiLoading && (
          <button
            onClick={handleGenerateReport}
            disabled={entries.length === 0}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}
          >
            <Sparkles className="w-4 h-4" />
            {entries.length === 0 ? 'Log expenses to enable AI analysis' : 'Generate AI Insight Report'}
          </button>
        )}

        {/* Loading state */}
        {aiLoading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg animate-pulse"
              style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}
            >
              <Brain className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--stormyTeal)' }}>
              Gemini is analysing your spending patterns…
            </p>
            <p className="text-xs" style={{ color: 'var(--pearlAqua)' }}>
              This may take 15–30 seconds (auto-retries if needed)
            </p>
          </div>
        )}

        {/* Error state */}
        {aiError && !aiLoading && (
          <div className="rounded-xl p-4 border" style={{ background: '#fff1f2', borderColor: '#fca5a5' }}>
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
              <p className="text-sm font-semibold text-red-700">{aiError}</p>
            </div>
            <button
              onClick={handleGenerateReport}
              className="w-full py-2 rounded-xl text-xs font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Report output */}
        {aiReport && !aiLoading && <AIReportPanel report={aiReport} />}

        {/* Trend icon if no report yet */}
        {!aiReport && !aiLoading && !aiError && entries.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--pearlAqua)' }} />
            <p className="text-xs" style={{ color: 'var(--pearlAqua)' }}>
              {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} ready for analysis
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
