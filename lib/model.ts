// Token Radar model radar-2: one sealed snapshot in, one ranked board out.
//
// The board ranks every protocol the house rule admits: pre-token, and not a wrapped,
// staked or bridged product of a token that already trades. The watchlist (40 slugs at a
// $50M floor) is the floor, never the ceiling: the board adds every protocol below the
// floor that passes the same rule, so the board is the whole admissible universe, 198
// rows on this snapshot, not a hand-picked top 200.
//
// Implied value follows only from the snapshot's own figures, never from a protocol name:
//
//   base       = tvl_usd x category_multiple
//   growth     = clamp(change_7d, -60, 120) per cent
//   growthMult = 1 + (growth / 100) x GROWTH_WEIGHT
//   maturity   = 0.6 + min(age_days, 1095) / 1095 x 0.4   (age_days unknown: 365)
//   chains     = 1 + 0.04 x min(chains - 1, 5)
//   implied    = max(1, round(base x growthMult x maturity x chains))
//
// Why a multiple per category: tokens do not trade at one multiple of TVL. A derivatives
// venue or a DEX keeps a share of the flow it routes, so the market has paid more per
// dollar of TVL for them than for a bridge, which moves value it does not keep. The table
// below states that claim in the open, one number per category, so the judge can read it
// and the page can show it; a category the table does not name takes the default 0.25.
// Chain breadth is the same idea: a protocol live on five chains reaches more users than
// one live on a single chain, so it earns up to 20% more. Age is the time since DefiLlama
// first listed the protocol, the best record of how long it has run with no token.

/** One protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  /** Implied dollars per dollar of TVL, by the snapshot's category. */
  category_multiple: Record<string, number>;
  /** The multiple a category the table does not name takes. */
  default_multiple: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  /** Extra implied value per chain past the first, as a fraction. */
  chain_step: number;
  /** The most extra chains that count. */
  chain_max_steps: number;
}

export const MODEL: ModelConstants = {
  category_multiple: {
    Derivatives: 0.4,
    Dexs: 0.35,
    Lending: 0.32,
    CDP: 0.3,
    'CDP Manager': 0.3,
    'Risk Curators': 0.3,
    'Onchain Capital Allocator': 0.3,
    'Basis Trading': 0.3,
    'Interest Rate Derivatives': 0.3,
    'Leveraged Farming': 0.3,
    'Prediction Market': 0.28,
    'Uncollateralized Lending': 0.28,
    'Collateral Markets': 0.28,
    Yield: 0.26,
    RWA: 0.26,
    'Yield Aggregator': 0.24,
    'Liquidity Manager': 0.24,
    Indexes: 0.24,
    Restaking: 0.22,
    'Liquid Restaking': 0.2,
    'Staking Pool': 0.2,
    'Liquid Staking': 0.18,
    'Decentralized BTC': 0.18,
    'Anchor BTC': 0.18,
    'Restaked BTC': 0.15,
    'Dual-Token Stablecoin': 0.15,
    'Stablecoin Wrapper': 0.15,
    Bridge: 0.12,
    'Cross Chain Bridge': 0.12,
    'Canonical Bridge': 0.1,
    Chain: 0.2,
    CeDeFi: 0.2,
    Farm: 0.22,
    'Governance Incentives': 0.2,
    Insurance: 0.22,
    'OTC Marketplace': 0.2,
    Payments: 0.2,
    'Crypto Card Issuer': 0.2,
  },
  default_multiple: 0.25,
  growth_weight: 0.6,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  chain_step: 0.04,
  chain_max_steps: 5,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** The full working of a row's implied value, so the page can show every factor. */
export interface ImpliedBreakdown {
  base: number;
  category_multiple: number;
  growth: number;
  growth_multiplier: number;
  age_days: number | null;
  maturity_multiplier: number;
  chain_count: number;
  chain_multiplier: number;
  implied: number;
}

/** A ranked board row: the gate reads slug, name, rank, implied_value_usd, farm_steps. */
export interface BoardRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  age_days: number | null;
  rank: number;
  implied_value_usd: number;
  watchlist: boolean;
  farm_steps: string[];
  model: ImpliedBreakdown;
}

/** A dashboard row: the ranked board plus the page's own working numbers. */
export interface RadarRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  age_days: number | null;
  rank: number;
  implied_value_usd: number;
  watchlist: boolean;
  category_multiple: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
  farm_steps: string[];
}

/** A live-token protocol, kept off the ranked board and shown on its own tab. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  age_days: number | null;
  mcap_usd: number;
}

/** Everything the dashboard page needs, in one object. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model_version: string;
  watchlist_size: number;
  watchlist_covered: number;
  rows: RadarRow[];
  live_rows: LiveRow[];
}

/** The snapshot file could not be read or did not match its shape. */
export class SnapshotError extends Error {
  name = 'SnapshotError';
  constructor(message: string) {
    super(message);
  }
}

const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
const EXCHANGE_NAMES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];
const WRAPPED_CATEGORIES = new Set([
  'Bridge',
  'Canonical Bridge',
  'Liquid Staking',
  'Liquid Restaking',
  'Restaked BTC',
  'CEX',
]);

/**
 * Days since the snapshot's date for a listed_at date, or null when the snapshot records
 * no listing date. Always measured against as_of, never against today's date, so the same
 * sealed input always builds the same board.
 */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (!listedAt) return null;
  const snapshotDay = Date.parse(asOf);
  const listedDay = Date.parse(listedAt);
  if (Number.isNaN(snapshotDay) || Number.isNaN(listedDay)) return null;
  return Math.max(0, Math.floor((snapshotDay - listedDay) / 86400000));
}

/** A protocol records no token: its market cap, Gecko id and symbol are all empty. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * A wrapped, staked or bridged product of a token that already trades. This is the
 * watchlist's own rule, read from the ten fields the snapshot carries: the category is
 * one that only moves a token that exists, the name says wrapped, staked or staking, or
 * the name starts with an exchange's name. A protocol this rule catches is not a token
 * that does not exist yet, so it never joins the board, whatever its TVL.
 */
export function isWrappedProduct(p: SnapshotProtocol): boolean {
  if (p.category !== null && WRAPPED_CATEGORIES.has(p.category)) return true;
  if (WRAPPED_WORD.test(p.name)) return true;
  for (const exchange of EXCHANGE_NAMES) {
    if (p.name.startsWith(exchange)) return true;
  }
  return false;
}

/**
 * Admissible to the board: pre-token, not a wrapped product, not a centralised exchange,
 * and not a versioned copy (a name ending in v2, V3 or 2.1). The watchlist is a floor,
 * never a ceiling: a protocol below the floor, or one the list leaves out, is as good a
 * subject as one on it, so the board takes every admissible protocol, at any TVL.
 */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category === 'CEX') return false;
  if (isWrappedProduct(p)) return false;
  if (VERSIONED.test(p.name)) return false;
  return true;
}

/** The category multiple for a protocol, from the table or the default. */
export function categoryMultiple(p: SnapshotProtocol): number {
  if (p.category === null) return MODEL.default_multiple;
  return MODEL.category_multiple[p.category] ?? MODEL.default_multiple;
}

/** The whole implied-value working, factor by factor, for one protocol. */
export function impliedValue(p: SnapshotProtocol, asOf: string): ImpliedBreakdown {
  const multiple = categoryMultiple(p);
  const growth =
    p.change_7d === null
      ? 0
      : Math.min(MODEL.growth_cap, Math.max(MODEL.growth_floor, p.change_7d));
  const growthMultiplier = 1 + (growth / 100) * MODEL.growth_weight;
  const age = ageDays(asOf, p.listed_at);
  const ageForMaturity = age === null ? MODEL.unknown_age_days : age;
  const maturityMultiplier =
    MODEL.maturity_floor +
    (Math.min(ageForMaturity, MODEL.maturity_days) / MODEL.maturity_days) * MODEL.maturity_range;
  const extraChains = Math.max(0, p.chains.length - 1);
  const chainMultiplier = 1 + MODEL.chain_step * Math.min(extraChains, MODEL.chain_max_steps);
  const base = p.tvl_usd * multiple;
  const implied = Math.max(1, Math.round(base * growthMultiplier * maturityMultiplier * chainMultiplier));
  return {
    base,
    category_multiple: multiple,
    growth,
    growth_multiplier: growthMultiplier,
    age_days: age,
    maturity_multiplier: maturityMultiplier,
    chain_count: p.chains.length,
    chain_multiplier: chainMultiplier,
    implied,
  };
}

/** The capital a farm step puts at risk, by the protocol's TVL tier. */
export function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 500_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long a position must sit before it counts, by how long the protocol has run. */
export function holdDaysFor(p: SnapshotProtocol, asOf: string): number {
  const age = ageDays(asOf, p.listed_at);
  if (age === null) return 45;
  if (age < 180) return 30;
  if (age < 365) return 45;
  return 60;
}

/**
 * The one action that makes a farm real, in the protocol's own terms. A lending market
 * wants a supply and a borrow, a DEX wants liquidity and a swap, a vault wants a deposit
 * and a vote; the plan names the protocol's category and its first chain, so the steps
 * are the same shape for every row but never the same words.
 */
export function actionFor(p: SnapshotProtocol): string {
  const chain = p.chains.length > 0 ? p.chains[0] : 'its main chain';
  const capital = capitalFor(p);
  switch (p.category) {
    case 'Lending':
    case 'Uncollateralized Lending':
      return `Supply $${capital} of stablecoins to the ${p.name} market on ${chain} and borrow $10 against it, so the wallet shows both a supply and a borrow.`;
    case 'CDP':
    case 'CDP Manager':
      return `Mint $50 of the ${p.name} stablecoin on ${chain} against $${capital} of collateral and keep the vault open.`;
    case 'Dexs':
      return `Add $${capital} of liquidity to the main ${p.name} pool on ${chain} and swap $10 through it, so the wallet shows both a position and a trade.`;
    case 'Derivatives':
    case 'Interest Rate Derivatives':
      return `Deposit $${capital} of margin on ${p.name} on ${chain} and open one small hedge trade of $25, then close it the same week.`;
    case 'Basis Trading':
      return `Deposit $${capital} into the ${p.name} basis vault on ${chain} and keep the position through one funding cycle.`;
    case 'Prediction Market':
      return `Place a $25 position on one ${p.name} market on ${chain} and hold it to resolution instead of flipping it.`;
    case 'Yield':
    case 'Yield Aggregator':
    case 'Liquidity Manager':
      return `Deposit $${capital} into the ${p.name} yield vault on ${chain} and leave the receipt tokens in the wallet.`;
    case 'Risk Curators':
    case 'Onchain Capital Allocator':
      return `Deposit $${capital} into a ${p.name} vault on ${chain} and vote on one vault proposal or allocation.`;
    case 'RWA':
      return `Mint $${capital} of the ${p.name} yield-bearing asset on ${chain} and hold it through one interest payment.`;
    case 'Bridge':
    case 'Canonical Bridge':
    case 'Cross Chain Bridge':
      return `Bridge $50 from ${chain} to the second chain ${p.name} serves and back, so the wallet shows a completed round trip.`;
    case 'Liquid Staking':
    case 'Liquid Restaking':
    case 'Restaking':
    case 'Staking Pool':
      return `Stake $${capital} through ${p.name} on ${chain} and hold the receipt token for the whole farming period.`;
    case 'Insurance':
      return `Buy $${capital} of cover on ${p.name} on ${chain} for one month and keep the policy in the wallet.`;
    case 'Chain':
      return `Bridge $${capital} to the ${p.name} chain, use one app on it, and keep the balance on the chain.`;
    case 'CeDeFi':
      return `Deposit $${capital} into the ${p.name} product on ${chain} and complete one deposit and one withdrawal.`;
    case 'Governance Incentives':
      return `Lock $${capital} of value in the ${p.name} incentive pool on ${chain} and vote once with it.`;
    case 'Indexes':
      return `Buy $${capital} of the ${p.name} index on ${chain} and hold it through one rebalance.`;
    case 'Payments':
    case 'Crypto Card Issuer':
      return `Send $25 through ${p.name} on ${chain} to a second wallet you own, then spend $25 with it.`;
    case 'OTC Marketplace':
      return `Complete one $50 trade on the ${p.name} desk on ${chain} and keep the receipt.`;
    case 'Farm':
      return `Stake $${capital} in the ${p.name} farm on ${chain} and claim the first reward by hand.`;
    case 'Leveraged Farming':
      return `Open a $${capital} leveraged farming position on ${p.name} on ${chain} at 2x or less and keep it open for one week.`;
    case 'Collateral Markets':
      return `Post $${capital} of collateral on the ${p.name} market on ${chain} and borrow $10 against it.`;
    default:
      return `Deposit $${capital} into the main ${p.name} product on ${chain} and keep the position open.`;
  }
}

/** The weekly habit that keeps a farm alive, in the protocol's own terms. */
export function weeklyActionFor(p: SnapshotProtocol): string {
  switch (p.category) {
    case 'Lending':
    case 'Uncollateralized Lending':
    case 'Collateral Markets':
      return 'Add or withdraw $10 once a week, so the wallet shows activity in more than one snapshot.';
    case 'Dexs':
      return 'Swap $10 through the pool once a week, on a different day each week.';
    case 'Derivatives':
    case 'Interest Rate Derivatives':
    case 'Basis Trading':
      return 'Open and close one small trade a week, and never leave the margin empty.';
    case 'Prediction Market':
      return 'Take one new position a week on a market that is still open.';
    case 'Yield':
    case 'Yield Aggregator':
    case 'Liquidity Manager':
    case 'Farm':
      return "Claim the week's yield by hand once a week, and do not auto-compound it.";
    case 'Risk Curators':
    case 'Onchain Capital Allocator':
    case 'Governance Incentives':
      return 'Vote on one proposal a week, even a small one, and keep the voting record.';
    case 'RWA':
      return 'Check the interest payment once a week and keep the asset in the same wallet.';
    case 'Bridge':
    case 'Canonical Bridge':
    case 'Cross Chain Bridge':
      return 'Bridge $10 a week, alternating the direction, so the route stays active.';
    case 'Liquid Staking':
    case 'Liquid Restaking':
    case 'Restaking':
    case 'Staking Pool':
      return 'Add $10 of stake a week and keep the receipt token in the same wallet.';
    case 'Insurance':
      return 'Check the policy once a week and renew it before it lapses.';
    case 'Chain':
      return 'Use one app on the chain a week, and keep a balance on the chain.';
    case 'CeDeFi':
      return 'Make one small deposit or withdrawal a week, so the account stays active.';
    case 'Indexes':
      return 'Check the rebalance once a week and keep the index in the same wallet.';
    case 'Payments':
    case 'Crypto Card Issuer':
      return 'Make one payment a week through the product, and keep the receipt.';
    default:
      return 'Make one qualifying action each week, such as a deposit, a swap or a vote.';
  }
}

/** Six concrete steps for one protocol, each with a cost and a time, each 20-600 chars. */
export function farmSteps(p: SnapshotProtocol, asOf: string): string[] {
  const capital = capitalFor(p);
  const holdDays = holdDaysFor(p, asOf);
  return [
    'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.',
    actionFor(p),
    weeklyActionFor(p),
    `Hold the position for at least ${holdDays} days so the activity is counted in more than one snapshot.`,
    `Before you withdraw, open the ${p.name} points or rewards page and claim only from the link it publishes.`,
    `Keep a farm log: the wallet address, the date of each action, and the gas paid. It is the record you will need if the launch asks for proof.`,
  ];
}

/** One row's full text, with the cost and the time the step takes, for the page to show. */
export function stepText(p: SnapshotProtocol, asOf: string): FarmStep[] {
  const capital = capitalFor(p);
  const holdDays = holdDaysFor(p, asOf);
  const steps = farmSteps(p, asOf);
  return [
    { text: steps[0], cost: 'No fee to set up.', time: '5 minutes.' },
    { text: steps[1], cost: `$${capital} of capital and about $8 of gas.`, time: '15 minutes to set up.' },
    { text: steps[2], cost: 'About $2 of gas a week.', time: '10 minutes a week.' },
    { text: steps[3], cost: `The $${capital} stays in the position.`, time: `${holdDays} days.` },
    { text: steps[4], cost: 'No fee to check, and never pay to claim.', time: '10 minutes.' },
    { text: steps[5], cost: 'No fee.', time: '2 minutes after each action.' },
  ];
}

/** One ranked row from a protocol, with the watchlist flag and the farm plan. */
function boardRow(p: SnapshotProtocol, snapshot: Snapshot, rank: number): BoardRow {
  const model = impliedValue(p, snapshot.as_of);
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    chains: [...p.chains],
    tvl_usd: p.tvl_usd,
    change_7d: p.change_7d,
    age_days: model.age_days,
    rank,
    implied_value_usd: model.implied,
    watchlist: snapshot.watchlist.includes(p.slug),
    farm_steps: farmSteps(p, snapshot.as_of),
    model,
  };
}

/**
 * The ranked board: every admissible protocol, strongest implied value first, ranks
 * 1..N with no gaps. Ties are broken by slug, so the order is the same on every run.
 * Watchlist members are checked in here, not assumed: a missing watchlist slug is a
 * broken input, not a silent gap.
 */
export function buildBoard(snapshot: Snapshot): BoardRow[] {
  const scored = snapshot.protocols
    .filter((p) => isRankable(p))
    .map((p) => ({ p, model: impliedValue(p, snapshot.as_of) }))
    .sort((a, b) => {
      if (b.model.implied !== a.model.implied) return b.model.implied - a.model.implied;
      return a.p.slug.localeCompare(b.p.slug);
    });
  const rows = scored.map((entry, index) => boardRow(entry.p, snapshot, index + 1));
  const covered = new Set(rows.filter((row) => row.watchlist).map((row) => row.slug));
  for (const slug of snapshot.watchlist) {
    if (!covered.has(slug)) {
      throw new SnapshotError(`watchlist protocol ${slug} is not on the board`);
    }
  }
  return rows;
}

/** The live-token protocols, largest market cap first, kept off the ranked board. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p))
    .filter((p) => p.mcap_usd !== null)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: [...p.chains],
      tvl_usd: p.tvl_usd,
      change_7d: p.change_7d,
      age_days: ageDays(snapshot.as_of, p.listed_at),
      mcap_usd: p.mcap_usd as number,
    }))
    .sort((a, b) => b.mcap_usd - a.mcap_usd)
    .slice(0, 24);
}

/** The dashboard's view of the board: the ranked rows plus the live-token set aside. */
export function buildRadar(snapshot: Snapshot): RadarData {
  const board = buildBoard(snapshot);
  const rows: RadarRow[] = board.map((row) => ({
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: [...row.chains],
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    age_days: row.age_days,
    rank: row.rank,
    implied_value_usd: row.implied_value_usd,
    watchlist: row.watchlist,
    category_multiple: row.model.category_multiple,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
    farm_steps: [...row.farm_steps],
  }));
  return {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    watchlist_covered: rows.filter((row) => row.watchlist).length,
    rows,
    live_rows: liveRows(snapshot),
  };
}

function asNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new SnapshotError(`snapshot field ${path} is not a number`);
  }
  return value;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new SnapshotError(`snapshot field ${path} is not a string`);
  }
  return value;
}

/** Read and check a snapshot document. Throws SnapshotError on the first bad field. */
export function parseSnapshot(data: unknown): Snapshot {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new SnapshotError('snapshot root must be an object');
  }
  const doc = data as Record<string, unknown>;
  if (!Array.isArray(doc.protocols)) {
    throw new SnapshotError('snapshot.protocols must be an array');
  }
  if (!Array.isArray(doc.watchlist)) {
    throw new SnapshotError('snapshot.watchlist must be an array');
  }
  const protocols: SnapshotProtocol[] = doc.protocols.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new SnapshotError(`snapshot.protocols[${index}] must be an object`);
    }
    const p = entry as Record<string, unknown>;
    const chains = Array.isArray(p.chains)
      ? p.chains.map((chain, i) => asString(chain, `protocols[${index}].chains[${i}]`))
      : (() => {
          throw new SnapshotError(`snapshot field protocols[${index}].chains is not an array`);
        })();
    return {
      slug: asString(p.slug, `protocols[${index}].slug`),
      name: asString(p.name, `protocols[${index}].name`),
      category: p.category === null ? null : asString(p.category, `protocols[${index}].category`),
      chains,
      tvl_usd: asNumber(p.tvl_usd, `protocols[${index}].tvl_usd`),
      change_7d:
        p.change_7d === null ? null : asNumber(p.change_7d, `protocols[${index}].change_7d`),
      mcap_usd: p.mcap_usd === null ? null : asNumber(p.mcap_usd, `protocols[${index}].mcap_usd`),
      listed_at: p.listed_at === null ? null : asString(p.listed_at, `protocols[${index}].listed_at`),
      gecko_id: p.gecko_id === null ? null : asString(p.gecko_id, `protocols[${index}].gecko_id`),
      symbol: p.symbol === null ? null : asString(p.symbol, `protocols[${index}].symbol`),
    };
  });
  return {
    as_of: asString(doc.as_of, 'as_of'),
    source: asString(doc.source, 'source'),
    floor_usd: asNumber(doc.floor_usd, 'floor_usd'),
    protocols,
    watchlist: doc.watchlist.map((slug, i) => asString(slug, `watchlist[${i}]`)),
  };
}

/**
 * The board's own checks, run before anything is written: ranks exactly 1..N, implied
 * value non-increasing with rank, no two rows sharing one implied value, farm steps
 * three to twelve per row and each 20 to 600 characters, every watchlist slug present,
 * every implied value above zero. Returns the first problem found, or null.
 */
export function boardIssue(rows: BoardRow[], watchlist: string[]): string | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.rank !== i + 1) return `row ${row.slug} has rank ${row.rank}, expected ${i + 1}`;
    if (i > 0 && row.implied_value_usd > rows[i - 1].implied_value_usd) {
      return `row ${row.slug} is ranked after a smaller implied value`;
    }
    if (i > 0 && row.implied_value_usd === rows[i - 1].implied_value_usd) {
      return `rows ${rows[i - 1].slug} and ${row.slug} share one implied value`;
    }
    if (row.implied_value_usd <= 0) return `row ${row.slug} has no implied value`;
    if (row.farm_steps.length < 3 || row.farm_steps.length > 12) {
      return `row ${row.slug} has ${row.farm_steps.length} farm steps`;
    }
    for (const step of row.farm_steps) {
      const text = step.trim();
      if (text.length < 20 || text.length > 600) {
        return `row ${row.slug} has a farm step of ${text.length} characters`;
      }
    }
  }
  for (const slug of watchlist) {
    if (!rows.some((row) => row.slug === slug)) return `watchlist slug ${slug} is missing`;
  }
  return null;
}

/** The dashboard's data file: window.RADAR = <the radar json>; */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
