import { useEffect, useState } from "react";
import type { Hex } from "viem";
import { flatStreetAbi, erc20Abi } from "../../shared/abi.ts";
import { WIF } from "../../shared/chain.ts";
import type { Ctx } from "./App.tsx";
import { api, pub, walletClient, ensureChain, fmtWif, wif, usd, pct, tone, short, roundTitle, roundDates, mascotFor, type Entry, type Round } from "./lib.ts";
import { Mascot } from "./ui.tsx";

type Player = { claimable: string; entries: (Entry & { round: number })[] };

export default function Results({ ctx }: { ctx: Ctx }) {
  const { state, account } = ctx;
  const [me, setMe] = useState<Player | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<bigint>(0n);

  const load = () => account && api<Player>(`/api/player/${account}`).then(setMe);
  useEffect(() => {
    load();
  }, [account, state.updatedAt]);

  const past = state.rounds.filter((r) => r.status === "settled" || r.status === "cancelled").reverse();
  const burnedPct = Number((BigInt(state.totalBurned) * 1_000_000n) / BigInt(state.wifSupply || "1")) / 1e4;

  async function claim() {
    setMsg(null);
    try {
      await ensureChain();
      const w = walletClient(account!);
      const before = await pub.readContract({ address: WIF, abi: erc20Abi, functionName: "balanceOf", args: [account!] });
      setBusy("Claiming…");
      const h = await w.writeContract({ address: state.contract!, abi: flatStreetAbi, functionName: "claim" });
      await pub.waitForTransactionReceipt({ hash: h });
      const after = await pub.readContract({ address: WIF, abi: erc20Abi, functionName: "balanceOf", args: [account!] });
      setClaimed(after - before);
      setMsg(`Claimed ${fmtWif(after - before)} $WIF.`);
      await load();
    } catch (e) {
      setMsg(((e as { shortMessage?: string }).shortMessage ?? (e as Error).message).split("\n")[0]);
    } finally {
      setBusy(null);
    }
  }

  const champ = past.find((r) => r.status === "settled" && (r.top?.length ?? 0) > 0);
  const burned = wif(state.totalBurned);
  // furnace meter fills toward the next power-of-ten milestone
  const goal = Math.max(10_000, 10 ** Math.ceil(Math.log10(Math.max(1, burned) + 1)));

  return (
    <div className="results">
      <section className="ledger">
        <div className="furnace panel">
          <div className="furnace-art">
            <span className="flame" />
            <span className="flame two" />
          </div>
          <div className="furnace-body">
            <span className="label">The furnace · $WIF burned by WIF League</span>
            <strong className="display">{fmtWif(state.totalBurned)}</strong>
            <div className="meter">
              <span style={{ width: `${Math.min(100, (burned / goal) * 100)}%` }} />
            </div>
            <span className="hint">
              {burned === 0 ? "First burn lands at the first settle" : burnedPct >= 0.0001 ? `${burnedPct.toFixed(4)}% of all $WIF` : "every settle feeds it"}
              {state.wifUsd && burned ? ` · ${usd(burned * state.wifUsd)}` : ""} · next milestone {fmtWif(BigInt(goal) * 10n ** 18n)}
            </span>
          </div>
        </div>
        <div className="sticker lime">
          <span>Rolling into the next pot</span>
          <strong>{fmtWif(state.rollover)}</strong>
          <em>$WIF</em>
        </div>
        <div className="sticker">
          <span>Rounds settled</span>
          <strong>{state.rounds.filter((r) => r.status === "settled").length}</strong>
          <em>{state.rounds.reduce((n, r) => n + r.entryCount, 0)} lineups filed</em>
        </div>
      </section>

      {champ && <Podium ctx={ctx} round={champ} />}

      <div className="results-grid">
        <section className="panel">
          <div className="panel-head">
            <h2 className="display">Past rounds</h2>
          </div>
          {past.length === 0 && <p className="hint">The first results land after the first closing bell.</p>}
          {past.map((r) => (
            <a key={r.id} className="result-row" href={`#/round/${r.id}`}>
              <div>
                <b>
                  {roundTitle(r)} №{r.id}
                </b>
                <span className="hint"> {roundDates(r)}</span>
              </div>
              {r.status === "cancelled" ? (
                <span className="hint">Called off{r.entryCount ? " · refunds open" : " · no lineups"}</span>
              ) : (
                <div className="winners">
                  {(r.top ?? []).slice(0, 3).map((e, i) => (
                    <span key={e.id} className={`medal m${i + 1}`}>
                      <i>{i + 1}</i> {short(e.player)} <em className={tone(e.score)}>{pct(e.score)}</em>
                    </span>
                  ))}
                  <span className="hint">
                    pot {fmtWif(r.pot)} · burned {fmtWif((BigInt(r.pot) * 10n) / 100n)}
                  </span>
                </div>
              )}
            </a>
          ))}
        </section>

        <aside className="panel">
          <h3 className="display">Your winnings</h3>
          {!account ? (
            <button className="btn lime block" onClick={() => ctx.login().catch(() => {})}>
              Connect wallet
            </button>
          ) : (
            <>
              <div className="sticker lime wide">
                <span>Ready to claim</span>
                <strong>{me ? fmtWif(me.claimable) : "…"}</strong>
                <em>$WIF</em>
              </div>
              <button className="btn lime block big" disabled={!me || me.claimable === "0" || !!busy} onClick={claim}>
                {busy ?? "Claim $WIF"}
              </button>
              {msg && <p className="hint">{msg}</p>}
              {claimed > 0n && <TakeAsStock ctx={ctx} amount={claimed} />}
              <h4>Your lineups</h4>
              {me?.entries.length ? (
                <ul className="mine">
                  {me.entries
                    .slice()
                    .reverse()
                    .map((e) => (
                      <li key={`${e.round}-${e.id}`}>
                        <a href={`#/round/${e.round}`}>
                          <Mascot name={mascotFor(state.assets[e.picks[0]]?.symbol)} move={e.score} size={28} />
                          №{e.round} · {e.picks.map((p) => state.assets[p]?.symbol).join(" ")}
                        </a>
                        <span className={`move ${tone(e.score)}`}>{e.rank ? `#${e.rank} ${pct(e.score)}` : "on the blocks"}</span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="hint">No lineups yet.</p>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Podium({ ctx, round }: { ctx: Ctx; round: Round }) {
  const { state } = ctx;
  const top = (round.top ?? []).slice(0, 3);
  const order = [1, 0, 2].filter((i) => top[i]); // 2nd · 1st · 3rd
  return (
    <section className="podium panel">
      <div className="panel-head">
        <h2 className="display">
          Champions · {roundTitle(round)} №{round.id}
        </h2>
        <a className="hint" href={`#/round/${round.id}`}>
          Full leaderboard →
        </a>
      </div>
      <div className="steps">
        {order.map((i) => {
          const e = top[i];
          return (
            <div key={e.id} className={`step s${i + 1}`}>
              <Mascot name={mascotFor(state.assets[e.picks[0]]?.symbol)} move={1} size={i === 0 ? 120 : 92} />
              <b>{short(e.player)}</b>
              <span className={`move ${tone(e.score)}`}>{pct(e.score)}</span>
              <div className="block">{i + 1}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const KYBER = "https://aggregator-api.kyberswap.com/robinhood/api/v1";
// Stock Tokens can't go to these jurisdictions (docs.robinhood.com/rhj/restricted-jurisdictions)
const RESTRICTED_LIST = "https://docs.robinhood.com/rhj/restricted-jurisdictions";
const RESTRICTED = new Set(["US", "CA", "GB", "CH", "CU", "BY", "IR", "KP", "RU", "SY", "UA", "SS", "SD", "MM", "VE"]);

/** Swap freshly claimed $WIF into a real Stock Token through the KyberSwap aggregator. */
function TakeAsStock({ ctx, amount }: { ctx: Ctx; amount: bigint }) {
  const { state, account } = ctx;
  const [to, setTo] = useState(state.assets.find((a) => a.symbol === "NVDA")?.id ?? 0);
  const [quote, setQuote] = useState<{ out: number; usd: number; route: unknown; router: Hex } | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const asset = state.assets[to];

  // IP check on top of the self-certification below; a failed lookup leaves the checkbox as the gate
  useEffect(() => {
    fetch("https://api.country.is/")
      .then((r) => r.json())
      .then((d) => setBlocked(RESTRICTED.has(String(d?.country ?? "").toUpperCase())))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (blocked) return;
    setQuote(null);
    fetch(`${KYBER}/routes?tokenIn=${WIF}&tokenOut=${asset.token}&amountIn=${amount}`, { headers: { "x-client-id": "wifleague" } })
      .then((r) => r.json())
      .then((d) => {
        const rs = d?.data?.routeSummary;
        if (rs) setQuote({ out: Number(rs.amountOut) / 1e18, usd: Number(rs.amountOutUsd), route: rs, router: d.data.routerAddress });
        else setMsg("No route right now.");
      })
      .catch(() => setMsg("Quote unavailable."));
  }, [to, amount, blocked]);

  async function swap() {
    if (!quote || blocked) return;
    setMsg(null);
    try {
      await ensureChain();
      const w = walletClient(account!);
      const built = await fetch(`${KYBER}/route/build`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-client-id": "wifleague" },
        body: JSON.stringify({ routeSummary: quote.route, sender: account, recipient: account, slippageTolerance: 100 }),
      }).then((r) => r.json());
      if (!built?.data?.data) throw new Error(built?.message ?? "Could not build the swap");
      setBusy("Approving…");
      const a = await w.writeContract({ address: WIF, abi: erc20Abi, functionName: "approve", args: [quote.router, amount] });
      await pub.waitForTransactionReceipt({ hash: a });
      setBusy("Swapping…");
      const h = await w.sendTransaction({ to: built.data.routerAddress, data: built.data.data, value: 0n });
      await pub.waitForTransactionReceipt({ hash: h });
      setMsg(`Done — ${quote.out.toFixed(4)} ${asset.symbol} is in your wallet.`);
    } catch (e) {
      setMsg(((e as { shortMessage?: string }).shortMessage ?? (e as Error).message).split("\n")[0]);
    } finally {
      setBusy(null);
    }
  }

  if (blocked)
    return (
      <div className="take">
        <h4>Take it as a stock</h4>
        <p className="hint">
          Stock Tokens aren't available where you are, so this swap is switched off. Your $WIF winnings are yours to keep.{" "}
          <a href={RESTRICTED_LIST} target="_blank" rel="noreferrer">
            Restricted countries ↗
          </a>
        </p>
      </div>
    );

  return (
    <div className="take">
      <h4>Take it as a stock</h4>
      <p className="hint">Swap your winnings into a real Stock Token, routed by KyberSwap on Robinhood Chain.</p>
      <select value={to} onChange={(e) => setTo(Number(e.target.value))}>
        {state.assets.map((a) => (
          <option key={a.id} value={a.id}>
            {a.symbol} · {a.name}
          </option>
        ))}
      </select>
      <p className="num">{quote ? `≈ ${quote.out.toFixed(4)} ${asset.symbol} (${usd(quote.usd)})` : "Quoting…"}</p>
      <label className="hint check">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> I'm not a U.S. person and I'm not in a country on the{" "}
        <a href={RESTRICTED_LIST} target="_blank" rel="noreferrer">
          Stock Token restricted list
        </a>
        .
      </label>
      <button className="btn block" disabled={!quote || !ok || !!busy} onClick={swap}>
        {busy ?? `Swap to ${asset.symbol}`}
      </button>
      {msg && <p className="hint">{msg}</p>}
    </div>
  );
}
