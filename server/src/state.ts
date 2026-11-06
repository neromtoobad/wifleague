import type { Hex } from "viem";
import { flatStreetAbi, erc20Abi } from "../../shared/abi.ts";
import { WIF } from "../../shared/chain.ts";
import assetList from "../../shared/assets.json" with { type: "json" };
import { pub, deployment } from "./chain.ts";
import { history, type Point } from "./feeds.ts";
import { tierOf } from "../../shared/tiers.ts";

export const STATUS = ["none", "open", "live", "scoring", "settled", "cancelled"] as const;
export type Status = (typeof STATUS)[number];

export type Asset = {
  id: number;
  symbol: string;
  name: string;
  token: Hex;
  feed: Hex;
  price: number;
  updatedAt: number;
  change1d: number | null;
  spark: number[];
};

export type Entry = {
  id: number;
  player: Hex;
  referrer: Hex | null;
  picks: number[]; // picks[0] = captain
  score: number | null; // fraction, 0.01 = +1%
  rank: number | null;
};

export type Round = {
  id: number;
  kind: "week" | "sprint";
  lockTime: number;
  endTime: number;
  entryFee: string; // wei
  status: Status;
  pot: string;
  entryCount: number;
  assetCount: number;
  winners: number[]; // entry ids (0-based), -1 = empty
  startPrices: number[];
  returns: number[]; // per asset, live (from start → now) or final
  entries: Entry[];
};

const contract = deployment ? { address: deployment.address, abi: flatStreetAbi } : null;

export const state = {
  ready: false,
  updatedAt: 0,
  assets: [] as Asset[],
  rounds: [] as Round[],
  rollover: "0",
  totalBurned: "0",
  wifSupply: "0",
  wifUsd: 0,
};

const names = new Map(assetList.map((a) => [a.symbol, a.name]));

/** Refresh feed prices + 5-day sparklines for every registered asset. */
export async function refreshAssets() {
  const onchain = contract
    ? ((await pub.readContract({ ...contract, functionName: "assets" })) as readonly { token: Hex; feed: Hex; symbol: string }[])
    : assetList.map((a) => ({ token: a.token as Hex, feed: a.feed as Hex, symbol: a.symbol }));
  const hist = await Promise.all(onchain.map((a) => history(a.feed)));
  state.assets = onchain.map((a, id) => {
    const h = hist[id];
    return {
      id,
      symbol: a.symbol,
      name: names.get(a.symbol) ?? a.symbol,
      token: a.token,
      feed: a.feed,
      price: h.price,
      updatedAt: h.updatedAt,
      change1d: changeSince(h.points, h.updatedAt - 86_400),
      spark: downsample(h.points.filter((p) => p.t >= h.updatedAt - 5 * 86_400), 40),
    };
  });
}

function changeSince(points: Point[], t: number) {
  const before = [...points].reverse().find((p) => p.t <= t);
  if (!before || !points.length) return null;
  return points[points.length - 1].p / before.p - 1;
}

function downsample(points: Point[], n: number) {
  if (points.length <= n) return points.map((p) => p.p);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(points[Math.round((i * (points.length - 1)) / (n - 1))].p);
  return out;
}

/** Re-read every round and entry from the contract and compute live/final scores. */
export async function refreshRounds() {
  if (!contract) return;
  const [count, rollover, burned, supply] = await Promise.all([
    pub.readContract({ ...contract, functionName: "roundCount" }),
    pub.readContract({ ...contract, functionName: "rollover" }),
    pub.readContract({ ...contract, functionName: "totalBurned" }),
    pub.readContract({ address: WIF, abi: erc20Abi, functionName: "totalSupply" }),
  ]);
  state.rollover = rollover.toString();
  state.totalBurned = burned.toString();
  state.wifSupply = supply.toString();

  const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i));
  const rounds = await Promise.all(
    ids.map(async (id) => {
      const r = await pub.readContract({ ...contract, functionName: "getRound", args: [id] });
      const [entries, start, rets] = await Promise.all([
        pub.readContract({ ...contract, functionName: "entries", args: [id, 0n, 10_000n] }),
        pub.readContract({ ...contract, functionName: "startPrices", args: [id] }),
        pub.readContract({ ...contract, functionName: "assetReturns", args: [id] }),
      ]);
      return { id: Number(id), r, entries, start, rets };
    }),
  );

  // an empty open round at a retired price is hidden once a current tier covers the same window
  // (round 2 opened the Week at 5,000 before the tiers existed)
  const replaced = (id: number, r: (typeof rounds)[number]["r"]) =>
    STATUS[r.status] === "open" &&
    r.entryCount === 0 &&
    !tierOf(r.entryFee) &&
    rounds.some((o) => o.id !== id && o.r.lockTime === r.lockTime && o.r.endTime === r.endTime && tierOf(o.r.entryFee));

  state.rounds = rounds.filter(({ id, r }) => !replaced(id, r)).map(({ id, r, entries, start, rets }) => {
    const status = STATUS[r.status];
    const startPrices = start.map((p) => Number(p) / 1e8);
    let returns: number[] = [];
    if (rets.length) returns = rets.map((x) => Number(x) / 1e18);
    else if (status === "live") {
      returns = startPrices.map((p0, i) => (state.assets[i] ? state.assets[i].price / p0 - 1 : 0));
    }
    const list: Entry[] = entries.map((e, i) => {
      const picks = unpack(e.picks);
      return {
        id: i,
        player: e.player,
        referrer: /^0x0{40}$/i.test(e.referrer) ? null : e.referrer,
        picks,
        score: returns.length ? scoreOf(picks, returns) : null,
        rank: null,
      };
    });
    if (returns.length) {
      // same ordering as the contract: higher score first, earlier entry wins ties
      [...list].sort((a, b) => b.score! - a.score! || a.id - b.id).forEach((e, i) => (e.rank = i + 1));
    }
    return {
      id,
      kind: Number(r.endTime - r.lockTime) > 86_400 ? "week" : "sprint",
      lockTime: Number(r.lockTime),
      endTime: Number(r.endTime),
      entryFee: r.entryFee.toString(),
      status,
      pot: r.pot.toString(),
      entryCount: r.entryCount,
      assetCount: r.assetCount,
      winners: r.winners.map((w) => w - 1),
      startPrices,
      returns,
      entries: list,
    } satisfies Round;
  });
  state.updatedAt = Math.floor(Date.now() / 1000);
  state.ready = true;
}

export function unpack(packed: number | bigint) {
  const n = BigInt(packed);
  return Array.from({ length: 5 }, (_, i) => Number((n >> BigInt(8 * i)) & 0xffn));
}

/** Captain counts double: (2·r0 + r1 + r2 + r3 + r4) / 6 — mirrors FlatStreet._score. */
export const scoreOf = (picks: number[], returns: number[]) =>
  picks.reduce((s, a, i) => s + (i === 0 ? 2 : 1) * (returns[a] ?? 0), 0) / 6;

export async function refreshWifPrice() {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${WIF}`);
    const d = (await res.json()) as { pairs?: { priceUsd: string; liquidity?: { usd: number } }[] };
    const best = d.pairs?.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    if (best) state.wifUsd = Number(best.priceUsd);
  } catch {
    /* keep the last known price */
  }
}

export async function claimableOf(addr: Hex) {
  if (!contract) return "0";
  return (await pub.readContract({ ...contract, functionName: "claimable", args: [addr] })).toString();
}
