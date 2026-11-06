// Stake tiers: every Sprint and every Week opens once per tier, each with its own pot.
// Entry fees are whole $WIF; the contract stores them in wei.
export const TIERS = [
  { fee: 1_000, name: "Kickabout", blurb: "Warm-up stakes" },
  { fee: 10_000, name: "Pro League", blurb: "Real bragging rights" },
  { fee: 100_000, name: "Whale Cup", blurb: "Big fish only" },
] as const;

const WEI = 10n ** 18n;
export const tierOf = (feeWei: string | bigint) => TIERS.find((t) => BigInt(t.fee) * WEI === BigInt(feeWei)) ?? null;
