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

// ── Category groupings ────────────────────────────────────────────────────────
// Each group defines which spending_category values belong to it.
// Matching is case-insensitive substring, so 'food' matches 'Food & Dining'.

const FOOD_CATEGORIES        = ['food', 'dining', 'groceries', 'restaurant', 'cafe', 'snack', 'drink'];
const GROOMING_CATEGORIES    = ['grooming', 'personal care', 'salon', 'beauty', 'barber', 'haircut', 'spa'];
const HEALTH_CATEGORIES      = ['health', 'healthcare', 'medical', 'medicine', 'pharmacy', 'clinic', 'doctor', 'therapy', 'hospital'];
const EDUCATION_CATEGORIES   = ['education', 'course', 'tuition', 'learning', 'books', 'workshop', 'training', 'skill'];
const SHOPPING_CATEGORIES    = ['shopping', 'clothing', 'fashion', 'apparel', 'accessories', 'electronics', 'gadget'];
const TRAVEL_CATEGORIES      = ['travel', 'flight', 'hotel', 'trip', 'vacation', 'transport', 'commute', 'cab', 'taxi', 'bus', 'train'];
const ENTERTAINMENT_CATEGORIES = ['entertainment', 'movie', 'concert', 'game', 'gaming', 'streaming', 'subscription', 'sport', 'event'];
const BILLS_CATEGORIES       = ['bill', 'utilities', 'rent', 'electricity', 'internet', 'phone', 'insurance', 'emi', 'loan'];
const INVESTMENT_CATEGORIES  = ['investment', 'savings', 'mutual fund', 'stock', 'sip', 'crypto', 'fd', 'ppf'];

/** Returns true if the category string matches any keyword in a group. */
function inCategory(cat: string, group: string[]): boolean {
  const low = cat.toLowerCase();
  return group.some(k => low.includes(k));
}

// ── Trigger keyword mapping ────────────────────────────────────────────────────
// RULE: Keywords must describe the REASON for buying, NOT the buyer's mood.
// Bare mood words ('sad', 'upset', 'lonely') must NOT appear here.

const TRIGGER_KEYWORDS: Record<string, string[]> = {
  'Impulse': [
    'impulse', 'saw it', 'just bought', "couldn't resist", 'spontaneous',
    'spur of the moment', 'randomly', 'suddenly felt like', 'on a whim',
    'without thinking', 'clicked buy', 'added to cart',
  ],
  'Stress Relief': [
    'stress', 'stressed', 'overwhelmed', 'anxious', 'needed a break',
    'pressure', 'burnout', 'exhausted', 'can\'t cope', 'too much work',
  ],
  'Boredom': [
    'bored', 'nothing to do', 'killing time', 'just browsing',
    'had nothing planned', 'time to kill', 'scrolling', 'no plans',
  ],
  'Social Pressure': [
    'friend', 'everyone has', 'peer', 'group', 'social', 'everyone is',
    'people around me', 'others were', 'they all have', 'didn\'t want to miss out with',
    'colleague', 'team', 'office',
  ],
  'Reward': [
    'deserved', 'reward', 'treat', 'celebrate', 'hard work', 'achievement',
    'earned it', 'worked hard', 'finished', 'promotion', 'completed',
    'milestone', 'birthday', 'anniversary',
  ],
  'FOMO': [
    'fomo', 'sale', 'limited edition', 'last chance', 'offer', 'deal',
    'discount', 'expires', 'ending soon', 'flash sale', 'only a few left',
    'going out of stock', 'trending', 'everyone is buying',
  ],
  // Only keywords that imply food as a coping mechanism — NOT bare mood words
  'Emotional Eating': [
    'comfort food', 'stress eating', 'binge', 'craving', 'ate my feelings',
    'emotional hunger', 'food to feel better', 'eating to cope',
    'midnight snack', 'junk food craving', 'emotional eating',
  ],
  // For non-food items bought to improve mood
  'Mood-Driven': [
    'felt down', 'feeling low', 'to cheer myself', 'to feel better',
    'make myself happy', 'pick me up', 'needed cheering', 'uplift my mood',
    'distract myself', 'cheer up', 'treat myself', 'self-treat',
  ],
  // Education-specific: buying learning material without a plan
  'Unplanned Learning': [
    'enrolled spontaneously', 'bought on a whim', 'saw the course', 'thought i should learn',
    'just started', 'random course', 'no goal', 'maybe someday',
  ],
};

// ── High-risk mood + category combos ──────────────────────────────────────────

const HIGH_RISK_MOODS      = ['Stressed', 'Sad', 'Bored'];
const HIGH_RISK_CATEGORIES = ['Shopping', 'Entertainment', 'Other'];

// ── Core analysis function ─────────────────────────────────────────────────────

export function analyseEntry(input: InsightInput): InsightOutput {
  const { mood, spending_type, amount, reason, spending_category } = input;
  const reasonLower = reason.toLowerCase();

  // Category flags — used throughout trigger gating and recommendation logic
  const isFood        = inCategory(spending_category, FOOD_CATEGORIES);
  const isGrooming    = inCategory(spending_category, GROOMING_CATEGORIES);
  const isHealth      = inCategory(spending_category, HEALTH_CATEGORIES);
  const isEducation   = inCategory(spending_category, EDUCATION_CATEGORIES);
  const isShopping    = inCategory(spending_category, SHOPPING_CATEGORIES);
  const isTravel      = inCategory(spending_category, TRAVEL_CATEGORIES);
  const isEntertainment = inCategory(spending_category, ENTERTAINMENT_CATEGORIES);
  const isBills       = inCategory(spending_category, BILLS_CATEGORIES);
  const isInvestment  = inCategory(spending_category, INVESTMENT_CATEGORIES);

  const isNeed = spending_type === 'Need';
  const isWant = spending_type === 'Want';

  // ── Detect triggers ─────────────────────────────────────────────────────────
  const triggers: string[] = [];
  for (const [trigger, keywords] of Object.entries(TRIGGER_KEYWORDS)) {
    // 'Emotional Eating' is only valid for food purchases
    if (trigger === 'Emotional Eating' && !isFood) continue;
    // 'Unplanned Learning' is only valid for education purchases
    if (trigger === 'Unplanned Learning' && !isEducation) continue;

    if (keywords.some((kw) => reasonLower.includes(kw))) {
      triggers.push(trigger);
    }
  }

  // ── Compute risk ─────────────────────────────────────────────────────────────
  let riskScore = 0;

  if (HIGH_RISK_MOODS.includes(mood)) riskScore += 2;
  if (isWant) riskScore += 1;
  if (HIGH_RISK_CATEGORIES.includes(spending_category)) riskScore += 1;
  if (triggers.includes('Impulse') || triggers.includes('FOMO')) riskScore += 2;
  if (triggers.includes('Stress Relief') || triggers.includes('Emotional Eating')) riskScore += 2;
  if (triggers.includes('Mood-Driven')) riskScore += 1;
  if (triggers.includes('Unplanned Learning')) riskScore += 1;
  if (amount > 5000) riskScore += 1;
  if (amount > 15000) riskScore += 1;

  // Reduce risk for clearly necessary categories
  if (isHealth || isBills || isInvestment) riskScore = Math.max(0, riskScore - 2);
  if (isEducation && !triggers.includes('Unplanned Learning')) riskScore = Math.max(0, riskScore - 1);

  const risk: 'Low' | 'Medium' | 'High' =
    riskScore >= 5 ? 'High' : riskScore >= 3 ? 'Medium' : 'Low';

  // ── Build summary ─────────────────────────────────────────────────────────────
  const triggerText = triggers.length > 0
    ? `driven by ${triggers.slice(0, 2).join(' and ')}`
    : 'without an obvious emotional driver';

  const summary = `This ${spending_category} purchase (₹${amount.toLocaleString('en-IN')}) was made while feeling ${mood} — ${triggerText}.`;

  // ── Recommendation logic ──────────────────────────────────────────────────────
  // Ordered by specificity: category + trigger combos first, then trigger-only,
  // then mood/amount fallbacks, then generic risk.
  let recommendation: string;

  // ─── BILLS & UTILITIES ───────────────────────────────────────────────────────
  if (isBills) {
    if (HIGH_RISK_MOODS.includes(mood)) {
      recommendation = `Bills and utilities are fixed obligations — feeling ${mood.toLowerCase()} about paying them is normal. If this is a recurring strain, review your budget to see if any fixed costs can be renegotiated or reduced.`;
    } else {
      recommendation = 'Fixed obligations like bills are a healthy part of financial planning. Paying them on time protects your credit and avoids late fees. Keep it up.';
    }

  // ─── HEALTHCARE ─────────────────────────────────────────────────────────────
  } else if (isHealth) {
    if (triggers.includes('FOMO') || triggers.includes('Impulse')) {
      recommendation = 'Health products can be heavily marketed. For supplements or wellness products you weren\'t prescribed, double-check they\'re evidence-based before reordering.';
    } else if (HIGH_RISK_MOODS.includes(mood)) {
      recommendation = `Health spending while feeling ${mood.toLowerCase()} is often necessary and valid. If medical costs are a recurring stress, explore generic alternatives or insurance coverage that could reduce the burden.`;
    } else {
      recommendation = 'Investing in your health is always a priority. If this is a recurring expense, look into whether a health plan or insurance could reduce your out-of-pocket costs.';
    }

  // ─── INVESTMENT ──────────────────────────────────────────────────────────────
  } else if (isInvestment) {
    if (triggers.includes('FOMO')) {
      recommendation = 'FOMO-driven investing — especially in trending assets like crypto — carries significant risk. Make sure this aligns with your risk profile and is money you can afford to lock away.';
    } else if (triggers.includes('Impulse')) {
      recommendation = 'Spontaneous investments can be dangerous. Before committing, verify the instrument, understand the lock-in period, and ensure it fits your overall financial plan.';
    } else {
      recommendation = 'Consistent investing is one of the best financial habits. Ensure this fits your overall asset allocation and that you\'re not compromising your emergency fund.';
    }

  // ─── EDUCATION ───────────────────────────────────────────────────────────────
  } else if (isEducation) {
    if (triggers.includes('Unplanned Learning') || triggers.includes('Impulse')) {
      recommendation = 'Buying a course is step one — finishing it is step two. Before purchasing the next one, schedule dedicated time and set a concrete goal for what you\'ll apply from this one.';
    } else if (triggers.includes('FOMO')) {
      recommendation = 'Educational content rarely disappears forever. Check if you have bandwidth to complete this before buying on a discount — an unfinished course at 80% off is still a wasted spend.';
    } else if (triggers.includes('Stress Relief')) {
      recommendation = 'Learning as a stress response can be productive, but avoid buying courses as a substitute for action. Set a start date before your next purchase.';
    } else if (triggers.includes('Boredom')) {
      recommendation = 'Learning from boredom is genuinely great! Just make sure you schedule time to complete what you buy — boredom passes but the subscription charge stays.';
    } else if (triggers.includes('Social Pressure')) {
      recommendation = 'Choose learning paths based on your career or personal goals, not what peers are studying. Quality over trend wins every time.';
    } else if (triggers.includes('Reward')) {
      recommendation = 'Investing in yourself as a reward is one of the healthiest financial habits. Make sure it\'s a topic you\'re genuinely excited to explore.';
    } else {
      recommendation = 'Education is a strong investment. Track your progress and apply what you learn — that\'s what turns a cost into a return.';
    }

  // ─── GROOMING & PERSONAL CARE ────────────────────────────────────────────────
  } else if (isGrooming) {
    if (mood === 'Sad' || mood === 'Stressed') {
      recommendation = `Taking care of your appearance when feeling ${mood.toLowerCase()} is a healthy form of self-care — not a red flag. It's one of the lower-risk ways to invest in your wellbeing.`;
    } else if (triggers.includes('Impulse')) {
      recommendation = 'Grooming products can pile up unnoticed. Before buying more, check what you already have at home — duplicate products are common in this category.';
    } else if (triggers.includes('FOMO')) {
      recommendation = 'Grooming trends change fast. Stick to products that have worked for you before and resist buying solely because something is trending or on sale.';
    } else if (triggers.includes('Social Pressure')) {
      recommendation = 'Personal care choices should be driven by what works for you, not peer or social media pressure. Expensive doesn\'t always mean better.';
    } else {
      recommendation = 'Grooming and personal care are worthwhile investments. As long as this fits your budget, it\'s a well-placed spend.';
    }

  // ─── FOOD & DINING ───────────────────────────────────────────────────────────
  } else if (isFood) {
    if (triggers.includes('Emotional Eating')) {
      recommendation = 'Comfort eating is a very human response, but try to pair it with addressing the root emotion — a short walk, calling a friend, or journaling can complement the comfort food.';
    } else if (triggers.includes('Stress Relief')) {
      recommendation = 'Food can genuinely feel comforting under stress. Balance it with free stress-relievers like breathing exercises or a walk so food doesn\'t become your only coping tool.';
    } else if (triggers.includes('Impulse')) {
      recommendation = 'Impulse food buys add up quickly, especially with delivery apps. Try planning your meals for the week — it usually saves both money and decision fatigue.';
    } else if (triggers.includes('Boredom')) {
      recommendation = 'Eating out of boredom is one of the most common budget leaks. Keep healthy, low-cost snacks accessible at home as a first line of defense.';
    } else if (triggers.includes('Social Pressure')) {
      recommendation = 'Group dining comes with invisible social spending pressure. It\'s perfectly fine to order within your budget or suggest a more affordable venue next time.';
    } else if (triggers.includes('FOMO')) {
      recommendation = 'New restaurants and food trends are exciting, but they can be expensive and overhyped. Balance exploration with your trusted, affordable regulars.';
    } else {
      recommendation = isNeed
        ? 'Regular meals and groceries are essential. Track this category to spot trends and optimise your food budget over time.'
        : 'Dining out is a great experience. Keep it balanced with home cooking to protect your budget without sacrificing enjoyment.';
    }

  // ─── SHOPPING (clothing, electronics, accessories) ───────────────────────────
  } else if (isShopping) {
    if (triggers.includes('Impulse') && amount > 5000) {
      recommendation = 'Large unplanned shopping purchases are the hardest to justify later. Apply a 48-hour rule — if you still want it in two days, it\'s likely a genuine need.';
    } else if (triggers.includes('Impulse')) {
      recommendation = 'Even small impulse buys accumulate into significant amounts monthly. A quick audit of your last 5 impulse purchases often reveals the pattern.';
    } else if (triggers.includes('FOMO')) {
      recommendation = 'Sales create artificial urgency. Ask yourself: would you buy this at full price? If not, the discount is making the decision for you — not you.';
    } else if (triggers.includes('Social Pressure')) {
      recommendation = 'Buying to match others\' lifestyles is a well-documented financial trap. Your financial goals are more important than appearing on-trend.';
    } else if (triggers.includes('Mood-Driven') || (HIGH_RISK_MOODS.includes(mood) && isWant)) {
      recommendation = 'Retail therapy offers a short dopamine spike but rarely solves the underlying feeling. Try a free mood-booster first — a walk, music, or calling someone you trust.';
    } else if (triggers.includes('Boredom')) {
      recommendation = 'Shopping out of boredom is one of the biggest budget drains. Try window shopping online with items saved to a wishlist — revisit in 48 hours and see how many you still want.';
    } else if (triggers.includes('Reward') && amount > 10000) {
      recommendation = 'Rewarding yourself is healthy, but high-value shopping rewards can quietly derail savings goals. Consider if a smaller treat would feel just as satisfying.';
    } else if (triggers.includes('Reward')) {
      recommendation = 'A small shopping reward for genuine effort is reasonable. Just ensure it was budgeted for and doesn\'t crowd out a savings goal.';
    } else {
      recommendation = isNeed
        ? 'A planned shopping purchase within budget is perfectly healthy. Compare options to ensure you got the best value.'
        : 'Keep an eye on your shopping category over time — it\'s one of the easiest places for spending to silently inflate.';
    }

  // ─── TRAVEL ──────────────────────────────────────────────────────────────────
  } else if (isTravel) {
    if (triggers.includes('Impulse')) {
      recommendation = 'Spontaneous travel bookings can be exciting but harder to undo. Check cancellation policies and ensure you\'ve mentally budgeted for accommodation, food, and local costs on top of the fare.';
    } else if (triggers.includes('FOMO')) {
      recommendation = 'Flight and hotel deals can be genuine, but factor in all associated costs before booking. A cheap flight with expensive accommodation often isn\'t the deal it appears.';
    } else if (triggers.includes('Stress Relief')) {
      recommendation = 'A planned trip is a great investment in mental health. Budget for the full experience — not just the ticket — so financial stress doesn\'t cancel out the rest benefits.';
    } else if (triggers.includes('Social Pressure')) {
      recommendation = 'Group travel comes with invisible spending pressure — upgrades, restaurants, activities. Set a firm personal budget cap before joining and communicate it to your group.';
    } else if (triggers.includes('Reward')) {
      recommendation = 'A trip as a reward for hard work is meaningful. Book in advance where possible for better rates, and set a daily spending budget to stay in control on the go.';
    } else if (triggers.includes('Boredom')) {
      recommendation = 'Booking travel out of restlessness can lead to rushed, expensive trips. Make sure this is something you\'ve thought through — a well-planned trip is far more enjoyable.';
    } else if (HIGH_RISK_MOODS.includes(mood) && isWant) {
      recommendation = `Booking travel while feeling ${mood.toLowerCase()} can feel like an escape, but ensure you\'re making this decision from a clear headspace. Sleep on large travel commitments.`;
    } else {
      recommendation = isNeed
        ? 'Essential travel like commuting is a necessary expense. Look for monthly passes or bulk fares to optimise regular travel costs.'
        : 'Travel is one of the highest-value ways to spend — experiences outlast purchases. Ensure this trip is planned within your savings runway.';
    }

  // ─── ENTERTAINMENT & SUBSCRIPTIONS ───────────────────────────────────────────
  } else if (isEntertainment) {
    if (triggers.includes('Impulse') && reasonLower.includes('subscri')) {
      recommendation = 'Subscriptions are easy to forget and hard to track. Set a 30-day reminder to evaluate if you\'re actively using this before the next billing cycle.';
    } else if (triggers.includes('Impulse')) {
      recommendation = 'Entertainment impulse buys — especially games, apps, and DLC — feel exciting at the time of purchase but often lose appeal quickly. Apply a 24-hour wishlist rule.';
    } else if (triggers.includes('Boredom')) {
      recommendation = 'Entertainment bought out of boredom often doesn\'t solve it. Check if you\'re already subscribed to something similar, or try free content first.';
    } else if (triggers.includes('FOMO')) {
      recommendation = 'Entertainment FOMO — limited releases, pre-orders, early access — is a well-designed marketing tactic. Wait for reviews and confirmed value before buying on hype.';
    } else if (triggers.includes('Stress Relief')) {
      recommendation = 'Using entertainment to decompress is completely valid. Just watch for subscription creep — audit your entertainment spend monthly to drop what you no longer use.';
    } else if (triggers.includes('Social Pressure')) {
      recommendation = 'Shared entertainment (concerts, group games, events) can be great but expensive. Set a clear budget for social entertainment and stick to it.';
    } else {
      recommendation = isNeed
        ? 'Planned entertainment is a healthy part of a balanced budget. Keep tracking to spot subscription overlap or underused services.'
        : 'Entertainment enriches life. Review your subscriptions quarterly to ensure you\'re only paying for what you actively enjoy.';
    }

  // ─── GENERIC: Trigger-based fallbacks for uncategorised spending ──────────────
  } else if (triggers.includes('Stress Relief')) {
    recommendation = 'Try finding non-financial ways to decompress first — a walk, exercise, journaling, or talking to a friend — before spending to relieve stress.';
  } else if (triggers.includes('FOMO')) {
    recommendation = 'Sales and limited offers will always come around again. Only buy on discount if you genuinely needed it before you saw the deal.';
  } else if (triggers.includes('Impulse')) {
    recommendation = amount > 5000
      ? 'For unplanned purchases above ₹5,000, a 48-hour wait period is worth it — revisit whether you still want it after sleeping on it twice.'
      : 'Apply a 24-hour cool-down rule for unplanned purchases. If you still want it tomorrow, it\'s likely worth buying.';
  } else if (triggers.includes('Boredom')) {
    recommendation = 'Spending to escape boredom adds up quickly. Try a free alternative — a walk, a new playlist, a book, or a skill you\'ve been wanting to learn.';
  } else if (triggers.includes('Social Pressure')) {
    recommendation = 'Your financial goals are personal. It\'s completely fine to suggest budget-friendly alternatives or simply opt out of group spending.';
  } else if (triggers.includes('Mood-Driven')) {
    recommendation = isNeed
      ? 'Purchasing a needed item to lift your mood is reasonable. Just ensure it aligns with your monthly budget.'
      : 'Try a free mood-booster first — music, fresh air, or calling someone you trust — before spending to feel better.';
  } else if (triggers.includes('Reward')) {
    recommendation = 'Rewarding yourself is healthy! Just ensure this treat was budgeted for so it doesn\'t quietly crowd out a savings goal.';

  // ─── Fallbacks: amount + mood + risk ─────────────────────────────────────────
  } else if (amount > 15000 && isWant) {
    recommendation = 'This is a significant discretionary expense. Compare options, check your savings runway, and ensure it fits your monthly budget before fully committing.';
  } else if (HIGH_RISK_MOODS.includes(mood) && isWant) {
    recommendation = `Feeling ${mood.toLowerCase()} can subtly push us toward spending. Be gentle with yourself, but ask: would you make this same purchase on a good day?`;
  } else if (mood === 'Excited' && riskScore >= 3) {
    recommendation = 'Excitement is a great feeling, but it can blur our sense of value. Double-check this fits your budget before fully committing.';
  } else if (HIGH_RISK_MOODS.includes(mood) && isNeed) {
    recommendation = `Even necessary purchases made while feeling ${mood.toLowerCase()} can lead to choosing pricier options than needed. Make sure you got the best available value.`;
  } else if (risk === 'High') {
    recommendation = 'This purchase has several high-risk signals. Consider a 24-hour pause and reflect on whether it aligns with your financial goals.';
  } else if (risk === 'Medium') {
    recommendation = 'This purchase has some emotional signals worth noting. Reflect on whether it aligns with your financial goals before making similar ones.';
  } else {
    recommendation = 'This purchase appears intentional and low-risk. Keep tracking to maintain your financial mindfulness.';
  }

  return { summary, triggers, risk, recommendation };
}
