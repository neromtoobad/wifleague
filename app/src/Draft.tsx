import { useMemo, useState } from "react";
import { isAddress, type Hex } from "viem";
import { flatStreetAbi, erc20Abi } from "../../shared/abi.ts";
import { WIF } from "../../shared/chain.ts";
import type { Ctx } from "./App.tsx";
import { pub, walletClient, ensureChain, fmtWif, wif, usd, pct, tone, roundTitle, roundDates, clock, TEAMS, teamOf, mascotFor, formOf, type Asset, type Round } from "./lib.ts";
import { Mascot, Spark, Clock, Confetti, LineupCard } from "./ui.tsx";
import { tierOf } from "../../shared/tiers.ts";

export default function Draft({ ctx }: { ctx: Ctx }) {
  const { state, now } = ctx;
  const open = state.rounds.filter((r) => r.status === "open" && r.lockTime > now).sort((a, b) => a.lockTime - b.lockTime);
  const [roundId, setRoundId] = useState<number | null>(null);
  const cheapest = (kind: Round["kind"]) =>
    open.filter((r) => r.kind === kind).sort((a, b) => a.lockTime - b.lockTime || Number(BigInt(a.entryFee) - BigInt(b.entryFee)))[0];
  const round = open.find((r) => r.id === roundId) ?? cheapest("week") ?? open[0] ?? null;

  const [picks, setPicks] = useState<number[]>([]); // picks[0] is the captain
  const [team, setTeam] = useState("all");
  const [q, setQ] = useState("");

  const assets = useMemo(() => {
    let list = state.assets.slice(0, round?.assetCount ?? state.assets.length);
    if (team !== "all") list = list.filter((a) => teamOf(a.symbol).key === team);
    if (q) list = list.filter((a) => (a.symbol + a.name).toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [state.assets, team, q, round?.assetCount]);

  const toggle = (id: number) =>
    setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 5 ? [...p, id] : p));
  const captain = (id: number) => setPicks((p) => [id, ...p.filter((x) => x !== id)]);

  return (
    <div className="draft">
      {round ? <RoundHero ctx={ctx} round={round} rounds={open} cheapest={cheapest} setRoundId={setRoundId} /> : <NoRound />}

      <div className="draft-grid">
        <section className="market">
          <div className="market-head">
            <h2 className="display">Scout the market</h2>
            <span className="hint">{state.assets.length} Stock Tokens with live Chainlink feeds · tap five</span>
          </div>
          <div className="teams" role="tablist">
            <button className={`team-tab ${team === "all" ? "on" : ""}`} onClick={() => setTeam("all")}>
              <span className="team-all">All</span>
            </button>
            {TEAMS.map((t) => (
              <button key={t.key} className={`team-tab ${team === t.key ? "on" : ""}`} style={{ "--team": t.color } as React.CSSProperties} onClick={() => setTeam(t.key)} title={t.name}>
                <Mascot name={t.mascot} size={34} />
                <span>{t.name}</span>
              </button>
            ))}
            <input className="search" placeholder="Find a ticker" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="cards">
            {assets.map((a) => (
              <PlayerCard key={a.id} a={a} slot={picks.indexOf(a.id)} full={picks.length === 5} onClick={() => toggle(a.id)} />
            ))}
            {!assets.length && <p className="hint">No ticker matches “{q}”.</p>}
          </div>
          <p className="hint">Chainlink stock feeds run 24/5, so prices rest over the weekend. That's draft time.</p>
        </section>

        <aside className="lineup-col">
          {round && <Lineup ctx={ctx} round={round} picks={picks} setPicks={setPicks} captain={captain} />}
        </aside>
      </div>

      {picks.length > 0 && (
        <button className="tray" onClick={() => document.querySelector(".lineup-col")?.scrollIntoView({ behavior: "smooth" })}>
          <span className="tray-slots">
            {Array.from({ length: 5 }, (_, i) => {
              const a = state.assets[picks[i]];
              return <span key={i} className={`tray-slot ${i === 0 ? "cap" : ""}`}>{a ? <Mascot name={mascotFor(a.symbol)} size={30} /> : null}</span>;
            })}
          </span>
          <b>{picks.length === 5 ? "Enter →" : `${picks.length}/5`}</b>
        </button>
      )}
    </div>
  );
}

function RoundHero({
  ctx,
  round,
  rounds,
  cheapest,
  setRoundId,
}: {
  ctx: Ctx;
  round: Round;
  rounds: Round[];
  cheapest: (kind: Round["kind"]) => Round | undefined;
  setRoundId: (id: number) => void;
}) {
  const { state, now } = ctx;
  const pot = BigInt(round.pot);
  const potUsd = wif(pot) * state.wifUsd;
  const games = (["sprint", "week"] as const).map(cheapest).filter((r): r is Round => !!r);
  // the stake tiers open for this game's window, cheapest first
  const stakes = rounds
    .filter((r) => r.kind === round.kind && r.lockTime === round.lockTime && r.endTime === round.endTime)
    .sort((a, b) => Number(BigInt(a.entryFee) - BigInt(b.entryFee)));
  return (
    <section className="hero">
      <div className="hero-main">
        <div className="mode-tabs">
          {games.map((g) => (
            <button key={g.kind} className={g.kind === round.kind ? "on" : ""} onClick={() => setRoundId(g.id)}>
              <b>{roundTitle(g)}</b>
              <small>{g.kind === "week" ? "Mon → Fri close" : "one trading day"}</small>
            </button>
          ))}
        </div>
        {stakes.length > 1 && (
          <div className="stakes" role="radiogroup" aria-label="Pick your stake">
            <span className="stakes-label">Pick your stake</span>
            {stakes.map((r) => {
              const t = tierOf(r.entryFee);
              return (
                <button key={r.id} role="radio" aria-checked={r.id === round.id} className={`stake ${r.id === round.id ? "on" : ""}`} onClick={() => setRoundId(r.id)}>
                  <b>{t ? `${t.fee / 1000}K` : fmtWif(r.entryFee)}</b>
                  <span>{t?.name ?? "$WIF"}</span>
                  <small>
                    {r.entryCount} in · pot {fmtWif(r.pot)}
                  </small>
                </button>
              );
            })}
          </div>
        )}
        <h1 className="display hero-title">
          Draft five stocks.
          <br />
          <span className="hl">The market plays.</span>
        </h1>
        <p className="hero-sub">
          {roundDates(round)} · locks {clock(round.lockTime)}. {fmtWif(round.entryFee)} $WIF a lineup. Top three split 80% of the pot, 10% of it burns.
        </p>
        <div className="hero-stats">
          <div className="sticker lime">
            <span>Prize pot</span>
            <strong>{fmtWif(pot)}</strong>
            <em>
              $WIF{potUsd > 0.5 ? ` · ≈ ${usd(potUsd)}` : ""}
            </em>
          </div>
          <div className="sticker">
            <span>Draft closes in</span>
            <Clock to={round.lockTime} now={now} />
          </div>
          <div className="sticker">
            <span>Lineups in</span>
            <strong>{round.entryCount}</strong>
            <em>max 3 per wallet</em>
          </div>
        </div>
      </div>
      <div className="hero-art">
        <div className="bubble">Your first pick is captain. It counts double!</div>
        <Mascot name="flatty" size={230} className="flatty" />
      </div>
    </section>
  );
}

function NoRound() {
  return (
    <section className="hero">
      <div className="hero-main">
        <h1 className="display hero-title">The next draft is warming up.</h1>
        <p className="hero-sub">The keeper opens the next Week and Sprint automatically. Check back in a minute.</p>
      </div>
      <div className="hero-art">
        <Mascot name="flatty" size={200} className="flatty" />
      </div>
    </section>
  );
}

function PlayerCard({ a, slot, full, onClick }: { a: Asset; slot: number; full: boolean; onClick: () => void }) {
  const t = teamOf(a.symbol);
  const form = formOf(a.spark);
  const picked = slot >= 0;
  return (
    <button className={`pcard ${picked ? "picked" : ""} ${slot === 0 ? "cap" : ""} ${full && !picked ? "dim" : ""}`} style={{ "--team": t.color } as React.CSSProperties} onClick={onClick}>
      <span className="pcard-art">
        <span className="pcard-team">{t.name}</span>
        {form > 0.03 && <span className="streak hot">Hot</span>}
        {form < -0.03 && <span className="streak cold">Cold</span>}
        <Mascot name={mascotFor(a.symbol)} move={a.change1d} size={88} />
        {picked && <span className="pick-badge">{slot === 0 ? "C" : slot + 1}</span>}
      </span>
      <span className="pcard-body">
        <span className="pcard-tkr">{a.symbol}</span>
        <span className="pcard-name">{a.name}</span>
        <span className="pcard-row">
          <span className="num">${a.price.toFixed(2)}</span>
          <span className={`move ${tone(a.change1d)}`}>{pct(a.change1d)}</span>
        </span>
        <Spark data={a.spark} w={140} h={22} />
      </span>
    </button>
  );
}

function Lineup({ ctx, round, picks, setPicks, captain }: { ctx: Ctx; round: Round; picks: number[]; setPicks: (p: number[]) => void; captain: (id: number) => void }) {
  const { state, account } = ctx;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ round: number; entry: number } | null>(null);
  const fee = BigInt(round.entryFee);
  const byId = (id: number) => state.assets[id] as Asset;

  async function enter() {
    setError(null);
    try {
      const me = account ?? (await ctx.login());
      await ensureChain();
      const w = walletClient(me);
      const bal = await pub.readContract({ address: WIF, abi: erc20Abi, functionName: "balanceOf", args: [me] });
      if (bal < fee) throw new Error(`You need ${fmtWif(fee)} $WIF to enter. Grab some on Pons, then come back.`);
      const allowance = await pub.readContract({ address: WIF, abi: erc20Abi, functionName: "allowance", args: [me, state.contract!] });
      if (allowance < fee) {
        setBusy("Approving $WIF…");
        const h = await w.writeContract({ address: WIF, abi: erc20Abi, functionName: "approve", args: [state.contract!, fee] });
        await pub.waitForTransactionReceipt({ hash: h });
      }
      setBusy("Sending your five out…");
      const stored = localStorage.getItem("fs.ref");
      const referrer = (stored && isAddress(stored) && stored.toLowerCase() !== me.toLowerCase() ? stored : "0x0000000000000000000000000000000000000000") as Hex;
      const five = picks as [number, number, number, number, number];
      const h = await w.writeContract({
        address: state.contract!,
        abi: flatStreetAbi,
        functionName: "enter",
        args: [BigInt(round.id), five, referrer],
      });
      const rc = await pub.waitForTransactionReceipt({ hash: h });
      const entered = rc.logs.find((l) => l.address.toLowerCase() === state.contract!.toLowerCase() && l.topics.length === 4);
      setDone({ round: round.id, entry: entered ? Number(BigInt(entered.topics[2]!)) : round.entryCount });
      setPicks([]);
      await ctx.refresh();
    } catch (e) {
      const msg = (e as { shortMessage?: string; message: string }).shortMessage ?? (e as Error).message;
      setError(msg.split("\n")[0]);
    } finally {
      setBusy(null);
    }
  }

  if (done) {
    const share = `${location.origin}/s/${done.round}/${done.entry}`;
    const text = encodeURIComponent(`My five are on the field at WIF League — the fantasy stock league paid in $WIF. Beat me:`);
    return (
      <div className="panel filed">
        <Confetti />
        <span className="stamp">You're in!</span>
        <h3 className="display">Lineup locked in.</h3>
        <LineupCard round={done.round} entry={done.entry} />
        <a className="btn lime block" href={`https://x.com/intent/post?text=${text}&url=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer">
          Post your card on X
        </a>
        <p className="hint">Anyone who enters through your link pays you 5% of their entry.</p>
        <a className="btn block" href="#/me">
          See my team
        </a>
        <button className="btn ghost block" onClick={() => setDone(null)}>
          Draft another lineup (max 3)
        </button>
      </div>
    );
  }

  const slot = (i: number) => {
    const a = picks[i] != null ? byId(picks[i]) : null;
    const t = a ? teamOf(a.symbol) : null;
    return (
      <div key={i} className={`slot ${a ? "full" : ""} ${i === 0 ? "cap" : ""}`} style={t ? ({ "--team": t.color } as React.CSSProperties) : undefined}>
        {i === 0 && (
          <svg className="crown" viewBox="0 0 48 32" aria-label="Captain">
            <path d="M3 29V8l11 10L24 3l10 15 11-10v21z" fill="#ffc83d" stroke="#15120f" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        )}
        {a && t ? (
          <>
            <Mascot name={mascotFor(a.symbol)} move={a.change1d} size={i === 0 ? 84 : 56} />
            <b>{a.symbol}</b>
            {i === 0 ? <small>×2 captain</small> : <small className={tone(a.change1d)}>{pct(a.change1d)}</small>}
            <span className="slot-tools">
              {i > 0 && (
                <button title="Make captain" onClick={() => captain(a.id)}>
                  ♛
                </button>
              )}
              <button title="Remove" onClick={() => setPicks(picks.filter((x) => x !== a.id))}>
                ×
              </button>
            </span>
          </>
        ) : (
          <>
            <span className="plus">+</span>
            <small>{i === 0 ? "Captain" : `Pick ${i + 1}`}</small>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="panel lineup">
      <div className="panel-head">
        <h3 className="display">Your five</h3>
        <span className="count">{picks.length}/5</span>
      </div>
      <div className="pitch">
        {slot(0)}
        <div className="bench">{[1, 2, 3, 4].map(slot)}</div>
      </div>
      <button className="btn lime block big" disabled={picks.length !== 5 || !!busy || !state.contract} onClick={enter}>
        {busy ?? (picks.length === 5 ? `Enter · ${fmtWif(fee)} $WIF` : `Pick ${5 - picks.length} more`)}
      </button>
      {error && <p className="error">{error}</p>}
      <p className="hint center">
        Score = average move of your five, captain counted twice.{" "}
        <a href="https://www.ponsfamily.com/launchpad/0x5173b8eA6923c2d40267890D45C46a3480954773" target="_blank" rel="noreferrer">
          Need $WIF? Get it on Pons ↗
        </a>
      </p>
    </div>
  );
}
