import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { state, type Round, type Entry } from "./state.ts";
import { teamOf, mascotFor } from "../../shared/teams.ts";

const fontDir = fileURLToPath(new URL("../fonts/", import.meta.url));
const fontFiles = readdirSync(fontDir).map((f) => fontDir + f);

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const pct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(2)}%`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const FIELD = "#fbf3e1";
const CARD = "#fffaf0";
const INK = "#15120f";
const MUTED = "#6d6558";
const LIME = "#d8f04a";
const SUN = "#ffc83d";
const ROYAL = "#3b5bff";
const UP = "#0e9a52";
const DOWN = "#e0353a";
// static Google Fonts files carry the weight in the family name (no typographic family), so name them exactly
const D9 = `font-family="Barlow Condensed Black" font-style="italic"`;
const D8 = `font-family="Barlow Condensed ExtraBold" font-style="italic"`;
const B7 = `font-family="Barlow" font-weight="700"`;
const B6 = `font-family="Barlow SemiBold"`;

// mascots are embedded as data URIs so resvg can draw them without touching the network
const mascotDir = fileURLToPath(new URL("../mascots/", import.meta.url));
const mascot = new Map(
  ["", "t/"].flatMap((sub) =>
    readdirSync(mascotDir + sub)
      .filter((f) => f.endsWith(".png"))
      .map((f) => [sub + f.replace(".png", ""), `data:image/png;base64,${readFileSync(mascotDir + sub + f).toString("base64")}`] as const),
  ),
);

export function roundLabel(r: Round) {
  const d = (t: number) => new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return r.kind === "week" ? `The Week · ${d(r.lockTime)}–${d(r.endTime)}` : `The Sprint · ${d(r.lockTime)}`;
}

export function lineupCard(r: Round, e: Entry): Buffer {
  const assets = state.assets;
  const live = r.status === "live";
  const final = r.status === "settled" || r.status === "scoring";
  const W = 156;
  const G = 16;
  const cards = e.picks
    .map((a, i) => {
      const x = 60 + i * (W + G);
      const y = 196;
      const asset = assets[a];
      const team = teamOf(asset.symbol);
      const ret = r.returns[a];
      const color = ret == null ? MUTED : ret >= 0 ? UP : DOWN;
      const top = i === 0 ? SUN : team.color;
      return `
      <g>
        <rect x="${x + 5}" y="${y + 5}" width="${W}" height="236" rx="18" fill="${INK}"/>
        <rect x="${x}" y="${y}" width="${W}" height="236" rx="18" fill="${CARD}" stroke="${INK}" stroke-width="4"/>
        <path d="M${x + 2} ${y + 128} V${y + 18} a16 16 0 0 1 16 -16 H${x + W - 18} a16 16 0 0 1 16 16 V${y + 128} Z" fill="${top}"/>
        <line x1="${x}" y1="${y + 128}" x2="${x + W}" y2="${y + 128}" stroke="${INK}" stroke-width="4"/>
        <image href="${mascot.get(mascotFor(asset.symbol))}" x="${x + W / 2 - 54}" y="${y + 14}" width="108" height="108" preserveAspectRatio="xMidYMid meet"/>
        ${i === 0 ? `<path d="M${x + W / 2 - 24} ${y + 4} v-26 l12 10 l12 -18 l12 18 l12 -10 v26 z" fill="${SUN}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` : ""}
        <text x="${x + 14}" y="${y + 172}" ${D9} font-size="${asset.symbol.length > 4 ? 36 : 42}" fill="${INK}">${esc(asset.symbol)}</text>
        <text x="${x + 14}" y="${y + 196}" ${B7} font-size="15" fill="${MUTED}">${i === 0 ? "CAPTAIN ×2" : esc(team.name.toUpperCase())}</text>
        <text x="${x + 14}" y="${y + 222}" ${D9} font-size="24" fill="${color}">${ret == null ? "—" : pct(ret)}</text>
      </g>`;
    })
    .join("");

  const score = e.score;
  const lockDay = new Date(r.lockTime * 1000).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const status = final ? `FINAL · #${e.rank} OF ${r.entryCount}` : live ? `LIVE · #${e.rank} OF ${r.entryCount}` : `LOCKS ${lockDay.toUpperCase()}`;
  const scoreColor = score == null ? INK : score >= 0 ? UP : DOWN;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="stripes" width="68" height="68" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <rect width="34" height="68" fill="#ffffff" fill-opacity="0.06"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="${FIELD}"/>
  <rect x="20" y="20" width="1160" height="590" rx="34" fill="${ROYAL}" stroke="${INK}" stroke-width="5"/>
  <rect x="20" y="20" width="1160" height="590" rx="34" fill="url(#stripes)"/>

  <image href="${mascot.get("flatty")}" x="46" y="34" width="86" height="86"/>
  <text x="138" y="102" ${D9} font-size="58" fill="#ffffff">FLAT</text>
  <g transform="rotate(-3 300 80)">
    <rect x="262" y="44" width="186" height="66" rx="12" fill="${LIME}" stroke="${INK}" stroke-width="4"/>
    <text x="276" y="100" ${D9} font-size="58" fill="${INK}">STREET</text>
  </g>
  <rect x="${1140 - roundLabel(r).length * 9.4 - 44}" y="52" width="${roundLabel(r).length * 9.4 + 44}" height="48" rx="24" fill="${INK}"/>
  <text x="${1140 - 20}" y="86" text-anchor="end" ${D8} font-size="28" fill="${LIME}">${esc(roundLabel(r).toUpperCase())}</text>

  <text x="62" y="162" ${B7} font-size="26" fill="#e5e9ff">${esc(short(e.player))}’s five</text>
  ${cards}

  <rect x="935" y="201" width="210" height="236" rx="20" fill="${INK}"/>
  <rect x="930" y="196" width="210" height="236" rx="20" fill="${LIME}" stroke="${INK}" stroke-width="4"/>
  <text x="1035" y="240" text-anchor="middle" ${B7} font-size="17" letter-spacing="2" fill="${INK}">LINEUP SCORE</text>
  <text x="1035" y="318" text-anchor="middle" ${D9} font-size="68" fill="${scoreColor}">${score == null ? "—" : pct(score)}</text>
  <text x="1035" y="356" text-anchor="middle" ${D8} font-size="24" fill="${INK}">${esc(status)}</text>
  <line x1="954" y1="378" x2="1116" y2="378" stroke="${INK}" stroke-width="3" stroke-dasharray="6 6"/>
  <text x="1035" y="414" text-anchor="middle" ${D9} font-size="28" fill="${INK}">POT ${fmtWif(r.pot)} $WIF</text>

  <text x="62" y="530" ${D9} font-size="40" fill="#ffffff">THINK YOU CAN BEAT THIS FIVE?</text>
  <text x="62" y="568" ${B6} font-size="22" fill="#e5e9ff">Five Stock Tokens · Chainlink prices · paid in $WIF · 10% burns</text>
  <rect x="842" y="500" width="298" height="60" rx="30" fill="${CARD}" stroke="${INK}" stroke-width="4"/>
  <text x="991" y="540" text-anchor="middle" ${D9} font-size="30" fill="${INK}">FLATSTREET.NEROM.SITE</text>
</svg>`;
  return new Resvg(svg, { font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "Barlow" } }).render().asPng();
}

export const fmtWif = (wei: string) => {
  const n = Number(BigInt(wei) / 10n ** 15n) / 1000;
  return n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(0);
};
