import { createPublicClient, createWalletClient, custom, http, type Hex, type EIP1193Provider } from "viem";
import { robinhood } from "../../shared/chain.ts";

export type Asset = {
  id: number;
  symbol: string;
  name: string;
  token: Hex;
  price: number;
  updatedAt: number;
  change1d: number | null;
  spark: number[];
};

export type Entry = { id: number; player: Hex; referrer: Hex | null; picks: number[]; score: number | null; rank: number | null };

export type Round = {
  id: number;
  kind: "week" | "sprint";
  lockTime: number;
  endTime: number;
  entryFee: string;
  status: "none" | "open" | "live" | "scoring" | "settled" | "cancelled";
  pot: string;
  entryCount: number;
  assetCount: number;
  winners: number[];
  startPrices: number[];
  returns: number[];
  top?: Entry[];
  entries?: Entry[];
};

export type State = {
  ready: boolean;
  updatedAt: number;
  contract: Hex | null;
  wifUsd: number;
  rollover: string;
  totalBurned: string;
  wifSupply: string;
  assets: Asset[];
  rounds: Round[];
};

export const api = <T,>(path: string): Promise<T> => fetch(path).then((r) => r.json());

// VITE_RPC lets local dev point the app at an anvil fork
export const pub = createPublicClient({ chain: robinhood, transport: http(import.meta.env.VITE_RPC || undefined), batch: { multicall: true } });

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export async function connect() {
  if (!window.ethereum) throw new Error("No wallet found. Open this page in a wallet browser or install MetaMask / Rabby.");
  const [account] = (await window.ethereum.request({ method: "eth_requestAccounts" })) as Hex[];
  await ensureChain();
  return account;
}

export async function ensureChain() {
  const eth = window.ethereum!;
  const id = (await eth.request({ method: "eth_chainId" })) as string;
  if (parseInt(id, 16) === robinhood.id) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x1237" }] });
  } catch (e) {
    if ((e as { code?: number }).code !== 4902) throw e;
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x1237",
          chainName: "Robinhood Chain",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: robinhood.rpcUrls.default.http,
          blockExplorerUrls: [robinhood.blockExplorers.default.url],
        },
      ],
    });
  }
}

export const walletClient = (account: Hex) =>
  createWalletClient({ account, chain: robinhood, transport: custom(window.ethereum!) });

// ─── formatting ───
export const wif = (wei: string | bigint) => Number(BigInt(wei) / 10n ** 14n) / 1e4;
export const fmtWif = (wei: string | bigint) => {
  const n = wif(wei);
  // 100K not 100.0K, 12.5K stays 12.5K
  return n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : n >= 1e4 ? `${+(n / 1e3).toFixed(1)}K` : n.toLocaleString("en-US", { maximumFractionDigits: 0 });
};
export const usd = (n: number) =>
  n >= 1000 ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : `$${n.toFixed(2)}`;
export const pct = (x: number | null | undefined, dp = 2) =>
  x == null ? "—" : `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(dp)}%`;
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const tone = (x: number | null | undefined) => (x == null ? "" : x >= 0 ? "up" : "down");

export function until(t: number, now: number) {
  let s = Math.max(0, t - now);
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

export const day = (t: number) =>
  new Date(t * 1000).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
export const clock = (t: number) =>
  new Date(t * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC", hour12: false }) + " UTC";

export const roundTitle = (r: Round) => (r.kind === "week" ? "The Week" : "The Sprint");
export const roundDates = (r: Round) =>
  r.kind === "week" ? `${day(r.lockTime)} → ${day(r.endTime)}` : `${day(r.lockTime)}, bell to bell`;

export const explorer = (path: string) => `${robinhood.blockExplorers.default.url}/${path}`;

export { TEAMS, teamOf, mascotFor, type Team } from "../../shared/teams.ts";
export const mascotSrc = (name: string) => `/mascots/${name}.webp`;

// 5-day form from the sparkline: hot / cold streak stickers on the cards
export const formOf = (spark: number[]) => {
  if (spark.length < 2) return 0;
  return spark[spark.length - 1] / spark[0] - 1;
};
