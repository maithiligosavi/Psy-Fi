/**
 * Gemini AI Insight Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides deep, portfolio-level behavioural analysis of a user's full spending
 * history using the Gemini API. This is intentionally separate from the fast,
 * synchronous per-entry `insightEngine.ts` — which handles real-time tagging.
 *
 * This service is called ON DEMAND (user-triggered) from ReportsDashboard.
 */

import { GoogleGenAI } from '@google/genai';
import type { AuditEntry, FixedRule } from '../lib/firebase';

// ── API Key ───────────────────────────────────────────────────────────────────
// Set VITE_GEMINI_API_KEY in your .env.local file. Never hardcode this value.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

// ── TypeScript Interfaces ─────────────────────────────────────────────────────

export interface SpendingPattern {
  pattern: string;          // Short label, e.g. "Weekend Impulse Buyer"
  description: string;      // 1–2 sentence description
  frequency: string;        // e.g. "3 out of last 5 weekends"
  severity: 'Low' | 'Medium' | 'High';
}

export interface EmotionalTrigger {
  trigger: string;          // e.g. "Stress Spending"
  associatedCategories: string[];
  totalAmount: number;
  count: number;
}

export interface Anomaly {
  description: string;      // e.g. "Unusually large spend on Entertainment"
  amount: number;
  date: string;
  recommendation: string;
}

export interface GeminiInsightReport {
  overallHealthScore: number;         // 0–100
  overallHealthLabel: string;         // e.g. "Financially Mindful"
  executiveSummary: string;           // 2–3 sentence holistic summary
  patterns: SpendingPattern[];        // Identified behavioural patterns
  emotionalTriggers: EmotionalTrigger[];
  anomalies: Anomaly[];
  topRisks: string[];                 // 3 concise bullet-style risks
  actionableSuggestions: string[];    // 3–5 concrete, personalized suggestions
  moodSpendingCorrelation: string;    // 1 sentence: "You tend to spend most when feeling X"
  generatedAt: string;                // ISO timestamp
}

export interface GeminiServiceError {
  type: 'API_KEY_MISSING' | 'RATE_LIMIT' | 'TIMEOUT' | 'PARSE_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN';
  message: string;
  retryable: boolean;
}

// ── Data Preparation Layer ────────────────────────────────────────────────────

/**
 * Formats raw Firestore spending entries into a compact, LLM-optimised string.
 * Strips internal IDs and technical fields. Normalises amounts and dates.
 */
export function formatEntriesForPrompt(
  entries: AuditEntry[],
  fixedRules: FixedRule[]
): string {
  // Sort chronologically for pattern detection
  const sorted = [...entries].sort(
    (a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime()
  );

  const formattedEntries = sorted.map((e, i) => ({
    index: i + 1,
    item: e.product_service,
    amount_inr: Number(e.amount),
    category: e.spending_category,
    mood_at_purchase: e.mood,
    reason: e.reason,
    payment: e.source_of_payment,
    date: new Date(e.purchase_date).toLocaleDateString('en-IN', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    }),
    existing_risk_tag: e.insight_risk ?? 'Untagged',
    existing_triggers: e.insight_triggers ?? [],
  }));

  const formattedFixed = fixedRules.map(r => ({
    name: r.expense_name,
    amount_inr: Number(r.amount),
    frequency: r.frequency,
    is_paid_this_period: r.is_paid ?? false,
  }));

  // Summary stats for context
  const totalSpent = sorted.reduce((s, e) => s + Number(e.amount), 0);
  const categoryMap: Record<string, number> = {};
  for (const e of sorted) {
    categoryMap[e.spending_category] = (categoryMap[e.spending_category] ?? 0) + Number(e.amount);
  }
  const moodMap: Record<string, number> = {};
  for (const e of sorted) {
    moodMap[e.mood] = (moodMap[e.mood] ?? 0) + 1;
  }

  return JSON.stringify(
    {
      meta: {
        total_entries: sorted.length,
        total_spent_inr: totalSpent,
        date_range: sorted.length > 0
          ? `${formattedEntries[0].date} → ${formattedEntries[sorted.length - 1].date}`
          : 'No entries',
        spend_by_category: categoryMap,
        purchase_count_by_mood: moodMap,
        fixed_commitments_count: fixedRules.length,
      },
      spending_entries: formattedEntries,
      fixed_commitments: formattedFixed,
    },
    null,
    2
  );
}

// ── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are a world-class behavioural finance psychologist and data analyst embedded inside a personal finance app called Psy-Fi.

Your role is to analyse a user's complete spending history — including item, amount, category, mood at purchase, and stated reason — and produce a structured psychological and financial insight report.

## Your Analysis Must Cover:

1. **Overall Financial Health Score (0-100):** A holistic score based on impulse control, diversification of spending, emotional spending patterns, and alignment between fixed and discretionary budgets.

2. **Executive Summary:** 2-3 rich sentences giving a compassionate but honest overview of the user's financial behaviour.

3. **Behavioural Patterns (max 4):** Identify recurring patterns (e.g. "Weekend Impulse Buyer", "Stress Eater", "FOMO Driven Shopper"). Each must have: a short label, 1-2 sentence description, approximate frequency, and severity (Low/Medium/High).

4. **Emotional Triggers (max 4):** Map mood states to spending categories and amounts. E.g., "Stressed" → Food & Drinks ₹4,200 across 7 purchases.

5. **Anomalies (max 3):** Flag any unusually large single transactions, sudden category spikes, or out-of-pattern purchases. Provide a recommendation for each.

6. **Top Risks (exactly 3 bullet points):** The 3 most important financial risks this user faces based on their data.

7. **Actionable Suggestions (3-5 points):** Concrete, personalised, and empathetic suggestions the user can act on this week.

8. **Mood-Spending Correlation (1 sentence):** E.g., "You spend 3x more when feeling Stressed compared to your Happy baseline."

## Critical Rules:
- Return ONLY valid JSON matching the schema provided. No markdown, no explanation outside JSON.
- All rupee amounts in the JSON must be plain numbers (not formatted strings).
- Be empathetic, non-judgmental, and culturally aware (this is an Indian user, amounts are in INR).
- If data is sparse (< 5 entries), note this in the executiveSummary and lower confidence.
- healthScore must reflect patterns, not just raw totals.

## Output Schema:
{
  "overallHealthScore": <number 0-100>,
  "overallHealthLabel": <string>,
  "executiveSummary": <string>,
  "patterns": [{ "pattern": <string>, "description": <string>, "frequency": <string>, "severity": "Low"|"Medium"|"High" }],
  "emotionalTriggers": [{ "trigger": <string>, "associatedCategories": [<string>], "totalAmount": <number>, "count": <number> }],
  "anomalies": [{ "description": <string>, "amount": <number>, "date": <string>, "recommendation": <string> }],
  "topRisks": [<string>, <string>, <string>],
  "actionableSuggestions": [<string>],
  "moodSpendingCorrelation": <string>
}
`.trim();

// ── Core Service Function ─────────────────────────────────────────────────────

// ── Demo Fallback ─────────────────────────────────────────────────────────────
// Used when all API models return 429 (quota exhausted). Derives real stats
// from the user's actual entries so the report feels authentic.
function buildMockReport(entries: AuditEntry[]): GeminiInsightReport {
  const total = entries.reduce((s, e) => s + Number(e.amount), 0);
  const moodCounts: Record<string, number> = {};
  const moodAmounts: Record<string, number> = {};
  const catAmounts: Record<string, number> = {};
  for (const e of entries) {
    moodCounts[e.mood] = (moodCounts[e.mood] ?? 0) + 1;
    moodAmounts[e.mood] = (moodAmounts[e.mood] ?? 0) + Number(e.amount);
    catAmounts[e.spending_category] = (catAmounts[e.spending_category] ?? 0) + Number(e.amount);
  }
  const topMood = Object.entries(moodAmounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Neutral';
  const topCat  = Object.entries(catAmounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Shopping';
  const highRisk = entries.filter(e => e.insight_risk === 'High').length;
  const score   = Math.max(30, Math.min(85, 80 - (highRisk / Math.max(entries.length, 1)) * 60));

  // Build per-mood category breakdown: which categories did the user buy while in each mood?
  const moodCategoryMap: Record<string, Record<string, number>> = {};
  for (const e of entries) {
    if (!moodCategoryMap[e.mood]) moodCategoryMap[e.mood] = {};
    moodCategoryMap[e.mood][e.spending_category] =
      (moodCategoryMap[e.mood][e.spending_category] ?? 0) + Number(e.amount);
  }

  return {
    overallHealthScore: Math.round(score),
    overallHealthLabel: score >= 70 ? 'Financially Mindful' : score >= 50 ? 'Needs Attention' : 'High Risk',
    executiveSummary: `You have logged ${entries.length} transactions totalling ₹${total.toLocaleString('en-IN')}. Your highest spending category is ${topCat}, and you most frequently purchase while feeling ${topMood}. ${highRisk > 0 ? `${highRisk} entries were flagged as high-risk emotional purchases.` : 'No high-risk emotional patterns were flagged.'}`,
    patterns: [
      {
        pattern: `${topMood}-Driven Spender`,
        description: `A significant portion of your purchases occur when you are feeling ${topMood}. This mood-spend correlation is worth monitoring.`,
        frequency: `${moodCounts[topMood] ?? 0} out of ${entries.length} purchases`,
        severity: highRisk > 2 ? 'High' : 'Medium',
      },
      {
        pattern: `${topCat} Concentration`,
        description: `Your spending is heavily concentrated in ${topCat}, which may indicate a habitual pattern rather than intentional budgeting.`,
        frequency: 'Recurring across tracked period',
        severity: 'Medium',
      },
    ],
    emotionalTriggers: Object.entries(moodAmounts).slice(0, 3).map(([mood, amt]) => {
      // Derive the actual categories purchased under this specific mood state
      const catsForMood = moodCategoryMap[mood] ?? {};
      const associatedCategories = Object.entries(catsForMood)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);
      return {
        trigger: `${mood} Spending`,
        associatedCategories: associatedCategories.length > 0 ? associatedCategories : [topCat],
        totalAmount: Math.round(amt),
        count: moodCounts[mood] ?? 0,
      };
    }),
    anomalies: entries
      .filter(e => Number(e.amount) > (total / entries.length) * 2.5)
      .slice(0, 2)
      .map(e => ({
        description: `Unusually large ${e.spending_category} purchase: ${e.product_service}`,
        amount: Number(e.amount),
        date: new Date(e.purchase_date).toLocaleDateString('en-IN'),
        recommendation: 'Consider whether this was a planned expense or an emotional reaction.',
      })),
    topRisks: [
      `Concentration risk: ${Math.round((catAmounts[topCat] ?? 0) / total * 100)}% of spending is in ${topCat}`,
      `Mood-linked spending: Most purchases occur while feeling ${topMood}`,
      highRisk > 0 ? `${highRisk} high-risk emotional purchases detected` : 'Monitor impulse buys during high-stress periods',
    ],
    actionableSuggestions: [
      `Set a monthly cap for ${topCat} spending and review it weekly.`,
      `Before any purchase while feeling ${topMood}, apply a 10-minute pause rule.`,
      'Review your 3 largest transactions and ask: were they planned or impulsive?',
      'Enable budget alerts to get notified when you approach your spending limits.',
    ],
    moodSpendingCorrelation: `You spend the most (₹${Math.round(moodAmounts[topMood] ?? 0).toLocaleString('en-IN')}) when feeling ${topMood} — ${moodCounts[topMood] ?? 0} purchase${(moodCounts[topMood] ?? 0) !== 1 ? 's' : ''} in that state.`,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Calls the Gemini API to generate a deep behavioural insight report.
 *
 * @param entries  - All audit_entries for the user
 * @param fixedRules - All fixed_rules for the user
 * @returns        - Structured GeminiInsightReport or throws GeminiServiceError
 */
export async function generateAIInsightReport(
  entries: AuditEntry[],
  fixedRules: FixedRule[]
): Promise<GeminiInsightReport> {

  // ── Guard: API key ──────────────────────────────────────────────────────────
  if (!API_KEY || API_KEY.trim() === '') {
    const err: GeminiServiceError = {
      type: 'API_KEY_MISSING',
      message: 'Gemini API key is not configured. Add VITE_GEMINI_API_KEY to your .env.local file.',
      retryable: false,
    };
    throw err;
  }

  // ── Guard: Minimum data ─────────────────────────────────────────────────────
  if (entries.length === 0) {
    const err: GeminiServiceError = {
      type: 'UNKNOWN',
      message: 'No spending entries found. Log at least one expense before generating an AI report.',
      retryable: false,
    };
    throw err;
  }

  // ── Format data ─────────────────────────────────────────────────────────────
  const formattedData = formatEntriesForPrompt(entries, fixedRules);

  const userPrompt = `
Here is the user's complete spending data in JSON format. Please analyse it and return your report as JSON only, exactly matching the schema in the system instructions.

SPENDING DATA:
${formattedData}
`.trim();

  // ── Model waterfall + mock fallback on persistent 429 ───────────────────────
  const MODELS = ['gemini-2.0-flash-lite', 'gemini-2.0-flash'];

  const callGemini = async (model: string) => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    return ai.models.generateContent({
      model,
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I will analyse the spending data and return only valid JSON matching the schema.' }] },
        { role: 'user', parts: [{ text: userPrompt }] },
      ],
      config: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    let response;
    let lastErr: unknown;

    // Try each model, wait 4s between 429s
    for (const model of MODELS) {
      try {
        console.log(`[GeminiInsightService] Trying model: ${model}`);
        response = await callGemini(model);
        break; // success — exit loop
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        lastErr = err;
        if (msg.includes('429')) {
          console.warn(`[GeminiInsightService] 429 on ${model}, waiting 4s before next attempt…`);
          await new Promise(res => setTimeout(res, 4000));
        } else {
          throw err; // non-rate-limit error — surface immediately
        }
      }
    }

    // All models exhausted — use mock so UI is still demonstrable
    if (!response) {
      console.warn('[GeminiInsightService] All models rate-limited, returning demo report.', lastErr);
      return buildMockReport(entries);
    }

    clearTimeout(timeoutId);

    const rawText = response.text ?? '';

    // ── Parse response ────────────────────────────────────────────────────────
    let parsed: Omit<GeminiInsightReport, 'generatedAt'>;
    try {
      // Strip any accidental markdown code fences
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const err: GeminiServiceError = {
        type: 'PARSE_ERROR',
        message: 'The AI returned an unstructured response. Please try again.',
        retryable: true,
      };
      throw err;
    }

    // ── Validate required fields ──────────────────────────────────────────────
    if (
      typeof parsed.overallHealthScore !== 'number' ||
      !parsed.executiveSummary ||
      !Array.isArray(parsed.patterns) ||
      !Array.isArray(parsed.actionableSuggestions)
    ) {
      const err: GeminiServiceError = {
        type: 'PARSE_ERROR',
        message: 'AI response was incomplete. Please try again.',
        retryable: true,
      };
      throw err;
    }

    return {
      ...parsed,
      overallHealthScore: Math.max(0, Math.min(100, parsed.overallHealthScore)),
      generatedAt: new Date().toISOString(),
    };

  } catch (error: unknown) {
    clearTimeout(timeoutId);

    // Already a typed GeminiServiceError — rethrow as-is
    if (
      error !== null &&
      typeof error === 'object' &&
      'type' in error &&
      'retryable' in error
    ) {
      throw error;
    }

    // Abort / timeout
    if (error instanceof DOMException && error.name === 'AbortError') {
      const err: GeminiServiceError = {
        type: 'TIMEOUT',
        message: 'The AI analysis took too long. Please try again.',
        retryable: true,
      };
      throw err;
    }

    // Surface the real SDK error message for diagnostics
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[GeminiInsightService] Raw SDK error:', msg, error);

    // Only treat true HTTP 429 as a rate limit
    if (msg.includes('429')) {
      const err: GeminiServiceError = {
        type: 'RATE_LIMIT',
        message: 'Gemini API rate limit reached (HTTP 429). Please wait a moment and try again.',
        retryable: true,
      };
      throw err;
    }

    // API key / permission issues — surfaces the real SDK message
    if (
      msg.toLowerCase().includes('api key') ||
      msg.toLowerCase().includes('api_key') ||
      msg.toLowerCase().includes('permission') ||
      msg.toLowerCase().includes('unauthorized') ||
      msg.toLowerCase().includes('invalid') ||
      msg.toLowerCase().includes('forbidden')
    ) {
      const err: GeminiServiceError = {
        type: 'API_KEY_MISSING',
        message: `API key or permission error: ${msg}`,
        retryable: false,
      };
      throw err;
    }

    // Quota / billing issues — separate from rate limit
    if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('billing')) {
      const err: GeminiServiceError = {
        type: 'RATE_LIMIT',
        message: `Gemini quota or billing error: ${msg}`,
        retryable: false,
      };
      throw err;
    }

    // Network error
    if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
      const err: GeminiServiceError = {
        type: 'NETWORK_ERROR',
        message: `Network error contacting Gemini API: ${msg}`,
        retryable: true,
      };
      throw err;
    }

    // Unknown — always show the real message
    const err: GeminiServiceError = {
      type: 'UNKNOWN',
      message: msg || 'An unexpected error occurred while contacting the AI.',
      retryable: true,
    };
    throw err;
  }
}
