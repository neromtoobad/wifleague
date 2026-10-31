import type { Hex } from "viem";
import { feedAbi } from "../../shared/abi.ts";
import { pub } from "./chain.ts";

type RoundData = readonly [bigint, bigint, bigint, bigint, bigint];

const latest = (feed: Hex) => pub.readContract({ address: feed, abi: feedAbi, functionName: "latestRoundData" }) as Promise<RoundData>;
const roundData = (feed: Hex, id: bigint) =>
  pub.readContract({ address: feed, abi: feedAbi, functionName: "getRoundData", args: [id] }) as Promise<RoundData>;

/** The Chainlink round id that was current at time `t`: the last round published at or before it. */
export async function roundAt(feed: Hex, t: bigint): Promise<bigint> {
  const [latestId, , , updatedAt] = await latest(feed);
  if (updatedAt <= t) return latestId;
  const phase = latestId >> 64n;
  let lo = (phase << 64n) + 1n; // first round of the current phase
  let hi = latestId - 1n;
  const [, , , loAt] = await roundData(feed, lo);
  if (loAt > t) throw new Error(`no round at ${t} in current phase of ${feed}`);
  while (lo < hi) {
    const mid = lo + (hi - lo + 1n) / 2n;
    const [, , , at] = await roundData(feed, mid);
    if (at !== 0n && at <= t) lo = mid;
    else hi = mid - 1n;
  }
  return lo;
}

export const hintsAt = (feeds: Hex[], t: bigint) => Promise.all(feeds.map((f) => roundAt(f, t)));

export type Point = { t: number; p: number };

/** Latest price plus the recent round history of a feed (newest last). */
export async function history(feed: Hex, rounds = 140): Promise<{ price: number; updatedAt: number; points: Point[] }> {
  const [latestId, answer, , updatedAt] = await latest(feed);
  const firstInPhase = ((latestId >> 64n) << 64n) + 1n;
  const ids: bigint[] = [];
  for (let i = 0n; i < BigInt(rounds) && latestId - i >= firstInPhase; i++) ids.push(latestId - i);
  const data = await Promise.all(ids.map((id) => roundData(feed, id).catch(() => null)));
  const points = data
    .filter((d): d is RoundData => !!d && d[3] > 0n && d[1] > 0n)
    .map((d) => ({ t: Number(d[3]), p: Number(d[1]) / 1e8 }))
    .reverse();
  return { price: Number(answer) / 1e8, updatedAt: Number(updatedAt), points };
}
