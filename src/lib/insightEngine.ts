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

  if (triggers.includes('Stress Relief')) {
    recommendation = 'Try finding non-financial ways to decompress, such as a walk, exercise, or talking to a friend.';
  } else if (triggers.includes('FOMO')) {
    recommendation = 'Sales will always happen. Avoid buying something just because it is discounted if you didn\'t plan for it.';
  } else if (triggers.includes('Impulse')) {
    recommendation = 'Consider implementing a 24-hour "cool-down" period for unplanned purchases to avoid impulse buying.';
  } else if (triggers.includes('Social Pressure')) {
    recommendation = 'Your financial goals are personal. It\'s okay to suggest budget-friendly alternatives to your social group.';
  } else if (triggers.includes('Emotional Eating')) {
    recommendation = 'While comfort food helps in the moment, try addressing the root emotion or keep budget-friendly snacks at home.';
  } else if (triggers.includes('Boredom')) {
    recommendation = 'When bored, try engaging in a free hobby or learning a new skill instead of browsing stores.';
  } else if (triggers.includes('Reward')) {
    recommendation = 'It is great to reward yourself! Just ensure such treats are budgeted for so they don\'t cause financial stress later.';
  } else if (amount > 15000 && spending_type === 'Want') {
    recommendation = 'This is a significant discretionary expense. Ensure you\'ve compared options and adjusted your budget appropriately.';
  } else if (HIGH_RISK_MOODS.includes(mood) && spending_type === 'Want') {
    recommendation = `Feeling ${mood.toLowerCase()} can heavily influence spending. Be gentle with yourself and track if this purchase truly improved your mood.`;
  } else if (mood === 'Excited' && riskScore >= 3) {
    recommendation = 'Excitement can sometimes lead to overspending. Enjoy your purchase, but keep an eye on your overall budget!';
  } else if (risk === 'High') {
    recommendation = 'Consider a 24-hour pause before similar purchases to break the emotional spending cycle.';
  } else if (risk === 'Medium') {
    recommendation = 'Reflect on whether this aligns with your financial goals before making similar purchases.';
  } else {
    recommendation = 'This purchase appears intentional. Keep tracking to maintain awareness.';
  }

  return { summary, triggers, risk, recommendation };
}
