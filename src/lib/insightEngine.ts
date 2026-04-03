/**
 * Psy-Fi Psychological Insights Engine
 * ─────────────────────────────────────
 * Pure, side-effect-free module. Takes a spending entry and returns a
 * structured psychological analysis ready to be saved to Firestore and
 * displayed in the Behavioural History UI.
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface InsightResult {
  summary: string;          // headline sentence  e.g. "Stress-driven impulse buy detected"
  triggers: string[];       // list of identified triggers
  risk: RiskLevel;
  recommendation: string;   // one actionable behavioural-finance tip
}

// ─── Entry shape the engine needs ──────────────────────────────────────────────

interface EntryInput {
  mood: string;
  spending_type?: string;
  amount: number;
  reason: string;
  spending_category: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const NEGATIVE_MOODS  = new Set(['Stressed', 'Sad', 'Bored']);
const POSITIVE_MOODS  = new Set(['Happy', 'Excited']);
const NEUTRAL_MOODS   = new Set(['Neutral']);

const JUSTIFY_KEYWORDS   = ['deserve', 'just this once', 'only once', 'treat myself', 'earned it'];
const REWARD_KEYWORDS    = ['reward', 'celebrate', 'celebration', 'gift', 'special'];
const EMOTIONAL_KEYWORDS = ['feel', 'better', 'sad', 'upset', 'angry', 'mood'];

// ─── Internal helpers ───────────────────────────────────────────────────────────

function containsAny(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((w) => lower.includes(w));
}

function detectTriggers(entry: EntryInput): string[] {
  const { mood, spending_type, amount, reason } = entry;
  const isWant = spending_type === 'Want';
  const isNeed = spending_type === 'Need';
  const triggers: string[] = [];

  // ── Stress triggers ──
  if (mood === 'Stressed' && isWant)       triggers.push('Stress-induced impulse');
  if (mood === 'Stressed' && amount > 1500) triggers.push('High-value stress purchase');

  // ── Sadness triggers ──
  if (mood === 'Sad' && isWant)            triggers.push('Comfort / revenge spending');
  if (mood === 'Sad' && amount > 800)      triggers.push('Emotional comfort purchase');

  // ── Boredom triggers ──
  if (mood === 'Bored' && isWant)          triggers.push('Boredom-triggered impulse');
  if (mood === 'Bored' && amount > 1000)   triggers.push('Boredom overspend');

  // ── Excitement triggers ──
  if (mood === 'Excited' && isWant)        triggers.push('Excitement-driven overconsumption');
  if (mood === 'Excited' && amount > 3000) triggers.push('High-value excitement surge');

  // ── High-ticket discretionary ──
  if (isWant && amount > 5000)             triggers.push('High-ticket discretionary spend');

  // ── Cognitive justification patterns ──
  if (containsAny(reason, JUSTIFY_KEYWORDS))  triggers.push('Justification / entitlement pattern');
  if (containsAny(reason, REWARD_KEYWORDS))   triggers.push('Reward-seeking behaviour');
  if (containsAny(reason, EMOTIONAL_KEYWORDS) && NEGATIVE_MOODS.has(mood))
                                              triggers.push('Emotion-driven rationale');

  // ── Positive signals ──
  if ((POSITIVE_MOODS.has(mood) || NEUTRAL_MOODS.has(mood)) && isNeed)
                                              triggers.push('Mindful / planned purchase');
  if (POSITIVE_MOODS.has(mood) && isNeed && amount <= 1000)
                                              triggers.push('Rational low-risk spend');

  return triggers;
}

function calcRisk(mood: string, spending_type: string | undefined, amount: number, triggers: string[]): RiskLevel {
  const isWant       = spending_type === 'Want';
  const isNegMood    = NEGATIVE_MOODS.has(mood);
  const negativeTags = triggers.filter((t) =>
    !t.includes('Mindful') && !t.includes('Rational') && !t.includes('planned')
  );

  if (isNegMood && isWant && amount > 2000)  return 'High';
  if (isNegMood && (isWant || amount > 2000)) return 'High';
  if (negativeTags.length >= 2)               return 'High';
  if (mood === 'Excited' && isWant && amount > 1500) return 'Medium';
  if (negativeTags.length === 1)              return 'Medium';
  if (isWant && amount > 3000)                return 'Medium';
  return 'Low';
}

function buildSummary(triggers: string[], risk: RiskLevel, mood: string, spending_type?: string): string {
  if (triggers.includes('Mindful / planned purchase') && triggers.includes('Rational low-risk spend')) {
    return 'Rational, low-risk spending behaviour detected. Great financial mindfulness!';
  }
  if (triggers.includes('Mindful / planned purchase')) {
    return 'This appears to be a planned, rational purchase — good financial discipline.';
  }

  if (risk === 'High') {
    if (mood === 'Stressed') return 'High-risk stress spending detected — impulse likely driven by emotional pressure.';
    if (mood === 'Sad')      return 'Potential revenge/comfort spending under emotional distress — high financial risk.';
    if (mood === 'Bored')    return 'Boredom-fuelled high-spend detected — impulse control risk is elevated.';
    return 'Multiple psychological spending triggers identified — high financial risk pattern.';
  }
  if (risk === 'Medium') {
    if (mood === 'Excited')  return 'Excitement may be amplifying this purchase — moderate impulse risk.';
    if (triggers.includes('Justification / entitlement pattern'))
      return 'A cognitive justification pattern ("I deserve this") is present — moderate risk.';
    return 'Moderate psychological spending trigger detected. Pause and reflect before similar purchases.';
  }

  // Low risk
  if (spending_type === 'Want') return 'Low-risk discretionary purchase with no significant emotional triggers.';
  return 'Spending appears deliberate and aligned with your needs — low psychological risk.';
}

function buildRecommendation(risk: RiskLevel, mood: string, triggers: string[]): string {
  if (risk === 'High') {
    if (NEGATIVE_MOODS.has(mood)) {
      return 'Try the 24-hour rule: wait a full day before making Want purchases when you feel ' +
        mood.toLowerCase() + '. Emotional states are temporary; financial commitments are not.';
    }
    if (triggers.includes('Justification / entitlement pattern')) {
      return 'Notice the "I deserve it" story. Ask yourself: is this aligned with my goals, or is it a temporary emotional relief?';
    }
    return 'Pause before the next similar purchase. Write down three financial goals it might conflict with.';
  }
  if (risk === 'Medium') {
    if (mood === 'Excited') {
      return 'Excitement can inflate perceived value. Ask: "Would I still buy this at 10 PM without the rush?"';
    }
    return 'Good awareness. Consider whether this purchase fits a need or is a recurring impulse pattern.';
  }
  return 'Keep it up! Logging purchases mindfully is itself a powerful habit for financial wellbeing.';
}

// ─── Public API ─────────────────────────────────────────────────────────────────

export function analyseEntry(entry: EntryInput): InsightResult {
  const triggers       = detectTriggers(entry);
  const risk           = calcRisk(entry.mood, entry.spending_type, entry.amount, triggers);
  const summary        = buildSummary(triggers, risk, entry.mood, entry.spending_type);
  const recommendation = buildRecommendation(risk, entry.mood, triggers);

  return { summary, triggers, risk, recommendation };
}
