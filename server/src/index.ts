import { readFileSync, existsSync } from "node:fs";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { isAddress, type Hex } from "viem";
import { deployment, keeperAccount } from "./chain.ts";
import { state, refreshAssets, refreshRounds, refreshWifPrice, claimableOf } from "./state.ts";
import { tick } from "./keeper.ts";
import { lineupCard, roundLabel } from "./og.ts";

const app = new Hono();
const PUBLIC_URL = process.env.PUBLIC_URL ?? "https://wifleague.nerom.site";

// rounds without their entry lists (those can get big) + everything the home screen needs
app.get("/api/state", (c) =>
  c.json({
    ready: state.ready,
    updatedAt: state.updatedAt,
    contract: deployment?.address ?? null,
    wifUsd: state.wifUsd,
    rollover: state.rollover,
    totalBurned: state.totalBurned,
    wifSupply: state.wifSupply,
    assets: state.assets,
    rounds: state.rounds.map(({ entries, ...r }) => ({ ...r, top: topOf(entries) })),
  }),
);

app.get("/api/round/:id", (c) => {
  const r = state.rounds[Number(c.req.param("id"))];
  return r ? c.json(r) : c.json({ error: "no such round" }, 404);
});

app.get("/api/player/:addr", async (c) => {
  const addr = c.req.param("addr");
  if (!isAddress(addr)) return c.json({ error: "bad address" }, 400);
  const lower = addr.toLowerCase();
  const entries = state.rounds.flatMap((r) =>
    r.entries.filter((e) => e.player.toLowerCase() === lower).map((e) => ({ round: r.id, ...e })),
  );
  return c.json({ claimable: await claimableOf(addr as Hex), entries });
});

app.get("/og/:round/:entry", (c) => {
  const r = state.rounds[Number(c.req.param("round"))];
  const e = r?.entries[Number(c.req.param("entry").replace(/\.png$/, ""))];
  if (!r || !e) return c.text("not found", 404);
  return c.body(new Uint8Array(lineupCard(r, e)), 200, { "content-type": "image/png", "cache-control": "public, max-age=300" });
});

// share link: X/Telegram read the meta tags, people get bounced into the app
app.get("/s/:round/:entry", (c) => {
  const { round, entry } = c.req.param();
  const r = state.rounds[Number(round)];
  const e = r?.entries[Number(entry)];
  const title = r && e ? `My five for ${roundLabel(r)} · WIF League` : "WIF League";
  const img = `${PUBLIC_URL}/og/${round}/${entry}.png?v=${state.updatedAt}`;
  const ref = e ? `?ref=${e.player}` : "";
  return c.html(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<meta property="og:title" content="${title}"><meta property="og:description" content="Draft five Stock Tokens, priced by Chainlink, paid in $WIF.">
<meta property="og:image" content="${img}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${img}">
<meta http-equiv="refresh" content="0;url=/${ref}#/round/${round}"></head><body></body></html>`);
});

app.get("/api/health", (c) => c.json({ ok: true, ready: state.ready, keeper: keeperAccount?.address ?? null }));

const dist = new URL("../../app/dist/", import.meta.url);
if (existsSync(dist)) {
  const root = "./app/dist";
  app.use("/*", serveStatic({ root }));
  const index = readFileSync(new URL("index.html", dist), "utf8");
  app.get("*", (c) => c.html(index));
}

function topOf(entries: (typeof state.rounds)[number]["entries"]) {
  return entries
    .filter((e) => e.rank != null)
    .sort((a, b) => a.rank! - b.rank!)
    .slice(0, 5);
}

const loop = (fn: () => Promise<unknown>, ms: number, name: string) => {
  const run = () => fn().catch((e) => console.error(`[${name}]`, (e as Error).message.split("\n")[0]));
  run();
  setInterval(run, ms);
};

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`wif league on :${port} · contract ${deployment?.address ?? "(none)"} · keeper ${keeperAccount?.address ?? "off"}`);

const t0 = Date.now();
await refreshAssets().catch((e) => console.error("[assets]", e.message));
console.log(`[assets] ${state.assets.length} loaded in ${Date.now() - t0}ms`);
setInterval(() => refreshAssets().catch((e) => console.error("[assets]", e.message)), 120_000);
loop(refreshRounds, 15_000, "rounds");
loop(refreshWifPrice, 300_000, "wif");
if (keeperAccount) loop(tick, 60_000, "keeper");
