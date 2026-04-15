// Psychological Insight Engine
// Analyses a spending entry and returns a behavioural insight summary.

export interface InsightInput {
  mood: string;
  spending_type?: 'Need' | 'Want' | undefined;
  amount: number;
  reason: string;
  spending_category: string;
}

export interface InsightOutput {
  summary: string;
  triggers: string[];
  risk: 'Low' | 'Medium' | 'High';
  recommendation: string;
}

// ── Trigger keyword mapping ────────────────────────────────────────────────────

const TRIGGER_KEYWORDS: Record<string, string[]> = {
  'Impulse':      ['impulse', 'saw it', 'just bought', 'couldn\'t resist', 'spontaneous', 'spur'],
  'Stress Relief':['stress', 'stressed', 'overwhelmed', 'anxious', 'needed a break', 'pressure'],
  'Boredom':      ['bored', 'nothing to do', 'killing time', 'just browsing'],
  'Social Pressure': ['friend', 'everyone has', 'peer', 'gifted', 'group', 'social'],
  'Reward':       ['deserved', 'reward', 'treat', 'celebrate', 'hard work', 'achievement'],
  'FOMO':         ['fomo', 'sale', 'limited', 'last chance', 'offer', 'deal', 'discount'],
  'Emotional Eating': ['comfort', 'upset', 'sad', 'emotional', 'lonely', 'feeling down'],
};

// ── High-risk mood + category combos ──────────────────────────────────────────

const HIGH_RISK_MOODS = ['Stressed', 'Sad', 'Bored'];
const HIGH_RISK_CATEGORIES = ['Shopping', 'Entertainment', 'Other'];

// ── Core analysis function ─────────────────────────────────────────────────────

export function analyseEntry(input: InsightInput): InsightOutput {
  const { mood, spending_type, amount, reason, spending_category } = input;
  const reasonLower = reason.toLowerCase();

  // ── Detect triggers ────────────────────────────────────────────────────────
  const triggers: string[] = [];
  for (const [trigger, keywords] of Object.entries(TRIGGER_KEYWORDS)) {
    if (keywords.some((kw) => reasonLower.includes(kw))) {
      triggers.push(trigger);
    }
  }

  // ── Compute risk ───────────────────────────────────────────────────────────
  let riskScore = 0;

  if (HIGH_RISK_MOODS.includes(mood)) riskScore += 2;
  if (spending_type === 'Want') riskScore += 1;
  if (HIGH_RISK_CATEGORIES.includes(spending_category)) riskScore += 1;
  if (triggers.includes('Impulse') || triggers.includes('FOMO')) riskScore += 2;
  if (triggers.includes('Stress Relief') || triggers.includes('Emotional Eating')) riskScore += 2;
  if (amount > 5000) riskScore += 1;
  if (amount > 15000) riskScore += 1;

  const risk: 'Low' | 'Medium' | 'High' =
    riskScore >= 5 ? 'High' : riskScore >= 3 ? 'Medium' : 'Low';

  // ── Build summary ──────────────────────────────────────────────────────────
  const triggerText = triggers.length > 0
    ? `driven by ${triggers.slice(0, 2).join(' and ')}`
    : 'without an obvious emotional driver';

  const summary = `This ${spending_category} purchase (₹${amount.toLocaleString('en-IN')}) was made while feeling ${mood} — ${triggerText}.`;

  // ── Recommendation ─────────────────────────────────────────────────────────
  let recommendation: string;
  if (risk === 'High') {
    recommendation = 'Consider a 24-hour pause before similar purchases to break the emotional spending cycle.';
  } else if (risk === 'Medium') {
    recommendation = 'Reflect on whether this aligns with your financial goals before making similar purchases.';
  } else {
    recommendation = 'This purchase appears intentional. Keep tracking to maintain awareness.';
  }

  return { summary, triggers, risk, recommendation };
}
