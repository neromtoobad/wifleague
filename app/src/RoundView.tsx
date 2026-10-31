import { useEffect, useState } from "react";
import type { Ctx } from "./App.tsx";
import { api, fmtWif, wif, usd, pct, tone, short, roundTitle, roundDates, mascotFor, type Round, type Entry } from "./lib.ts";
import { Mascot, Clock } from "./ui.tsx";

const STATUS_LABEL: Record<Round["status"], string> = {
  none: "",
  open: "Drafting",
  live: "Live",
  scoring: "Photo finish",
  settled: "Final",
  cancelled: "Called off",
};
const LANES = 10;

export default function RoundView({ ctx, id }: { ctx: Ctx; id: number }) {
  const { state, now, account } = ctx;
  const [round, setRound] = useState<Round | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => api<Round>(`/api/round/${id}`).then((r) => alive && setRound(r));
    load();
    const t = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id]);

  if (!round || !round.entries) return <section className="empty panel">Loading the track…</section>;

  const others = state.rounds.filter((r) => r.status === "live" || r.status === "settled").slice(-6).reverse();
  const entries = [...round.entries].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.id - b.id);
  const isMe = (e: Entry) => !!account && e.player.toLowerCase() === account.toLowerCase();
  const mine = entries.filter(isMe);
  const pot = BigInt(round.pot);
  // mirrors settle(): referral cuts come off first, then 10% burn + 10% rollover, 80% to the podium
  const refCut = round.entries.filter((e) => e.referrer).length * wif(round.entryFee) * 0.05;
  const prizes = (wif(pot) - refCut) * 0.8;
  const podium = [0.5, 0.3, 0.2].map((s) => prizes * s);

  const movers = round.returns
    .map((r, i) => ({ r, a: state.assets[i] }))
    .filter((x) => x.a)
    .sort((a, b) => b.r - a.r);
  const maxMove = Math.max(0.0001, ...movers.map((m) => Math.abs(m.r)));
  // biggest winners and losers only; the full list is on every lineup's chips
  const wrap = movers.length > 12 ? [...movers.slice(0, 6), null, ...movers.slice(-6)] : movers;

  return (
    <div className="round">
      <section className="round-band">
        <div>
          <span className={`badge ${round.status}`}>{STATUS_LABEL[round.status]}</span>
          <h1 className="display">
            {roundTitle(round)} <span className="no">№{round.id}</span>
          </h1>
          <p className="hero-sub">{roundDates(round)}</p>
        </div>
        <div className="hero-stats">
          <div className="sticker lime">
            <span>Prize pot</span>
            <strong>{fmtWif(pot)}</strong>
            <em>$WIF{state.wifUsd ? ` · ≈ ${usd(wif(pot) * state.wifUsd)}` : ""}</em>
          </div>
          <div className="sticker">
            <span>{round.status === "live" ? "Closing bell" : round.status === "open" ? "Starts in" : "Lineups"}</span>
            {round.status === "live" ? (
              <Clock to={round.endTime} now={now} />
            ) : round.status === "open" ? (
              <Clock to={round.lockTime} now={now} />
            ) : (
              <strong>{round.entryCount}</strong>
            )}
          </div>
          <div className="sticker fire">
            <span>Burns at settle</span>
            <strong>{fmtWif((pot * 10n) / 100n)}</strong>
            <em>$WIF, gone for good</em>
          </div>
        </div>
      </section>

      {others.length > 1 && (
        <div className="round-tabs">
          {others.map((r) => (
            <a key={r.id} href={`#/round/${r.id}`} className={r.id === round.id ? "on" : ""}>
              {roundTitle(r)} №{r.id}
            </a>
          ))}
        </div>
      )}

      <Race round={round} entries={entries} isMe={isMe} ctx={ctx} />

      <div className="round-grid">
        <section className="panel">
          <div className="panel-head">
            <h3 className="display">Leaderboard</h3>
            <span className="hint">{round.status === "live" ? "live from Chainlink · every 15s" : ""}</span>
          </div>
          {entries.length === 0 ? (
            <p className="hint">No lineups yet. Be the first on the track.</p>
          ) : (
            <ol className="board">
              {entries.map((e) => {
                const prize = e.rank && e.rank <= 3 ? podium[e.rank - 1] : 0;
                return (
                  <li key={e.id} className={`${isMe(e) ? "me" : ""} ${e.rank && e.rank <= 3 ? `p${e.rank}` : ""}`}>
                    <span className="rank">{e.rank ?? "–"}</span>
                    <Mascot name={mascotFor(state.assets[e.picks[0]]?.symbol)} move={e.score} size={44} />
                    <div className="who">
                      <a href={`https://robinhoodchain.blockscout.com/address/${e.player}`} target="_blank" rel="noreferrer">
                        {isMe(e) ? "You" : short(e.player)}
                      </a>
                      <div className="chips">
                        {e.picks.map((p, i) => (
                          <span key={p} className={`tchip ${tone(round.returns[p])} ${i === 0 ? "cap" : ""}`} title={pct(round.returns[p])}>
                            {state.assets[p]?.symbol}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={`score ${tone(e.score)}`}>
                      {pct(e.score)}
                      {prize > 0 && round.status !== "open" && <small>{fmtNum(prize)} $WIF</small>}
                    </div>
                    <a className="share" href={`/s/${round.id}/${e.id}`} target="_blank" rel="noreferrer" title="Share card">
                      ↗
                    </a>
                  </li>
                );
              })}
            </ol>
          )}
          {mine.length > 0 && round.status === "live" && (
            <p className="hint">
              You have {mine.length} lineup{mine.length > 1 ? "s" : ""} running. Best spot: #{Math.min(...mine.map((m) => m.rank ?? 1e9))}.
            </p>
          )}
        </section>

        <aside className="panel">
          <div className="panel-head">
            <h3 className="display">Market wrap</h3>
          </div>
          {movers.length ? (
            <ul className="wrap">
              {wrap.map((m) =>
                m == null ? (
                  <li key="gap" className="gap">
                    ⋯
                  </li>
                ) : (
                <li key={m.a.symbol}>
                  <Mascot name={mascotFor(m.a.symbol)} move={m.r} size={26} />
                  <b>{m.a.symbol}</b>
                  <span className="bar-cell">
                    <span className={`bar ${tone(m.r)}`} style={{ width: `${Math.max(3, (Math.abs(m.r) / maxMove) * 100)}%` }} />
                  </span>
                  <span className={`move ${tone(m.r)}`}>{pct(m.r)}</span>
                </li>
                ),
              )}
            </ul>
          ) : (
            <p className="hint">Start prices are snapshotted at the lock. The wrap fills in once the race is on.</p>
          )}
          <p className="hint">
            Start and end prices are the Chainlink rounds that were current at the exact lock and closing times, checked onchain. Nobody can pick a
            better moment to settle.
          </p>
        </aside>
      </div>
    </div>
  );
}

/** Each lineup is a runner (its captain's mascot), placed on the track by its live score. */
function Race({ round, entries, isMe, ctx }: { round: Round; entries: Entry[]; isMe: (e: Entry) => boolean; ctx: Ctx }) {
  const { state } = ctx;
  const field = entries.slice(0, LANES);
  const started = round.status !== "open" && field.some((e) => e.score != null);
  const scores = field.map((e) => e.score ?? 0);
  const lo = Math.min(0, ...scores);
  const hi = Math.max(0, ...scores);
  const span = hi - lo || 1;
  const x = (s: number | null) => (started && s != null ? 4 + ((s - lo) / span) * 88 : 4);
  const zero = started ? 4 + ((0 - lo) / span) * 88 : 4;

  return (
    <section className="race panel">
      <div className="panel-head">
        <h3 className="display">{started ? "The race" : "On the blocks"}</h3>
        <span className="hint">
          {started ? `Top ${field.length} of ${entries.length} lineups, placed by score` : "Runners line up until the lock, then the market fires the gun"}
        </span>
      </div>
      {field.length === 0 ? (
        <p className="hint">The track is empty.</p>
      ) : (
        <div className="track">
          {started && (
            <span className="zero" style={{ left: `${zero}%` }}>
              <i>0%</i>
            </span>
          )}
          <span className="finish" />
          {field.map((e, i) => {
            const cap = state.assets[e.picks[0]];
            return (
              <div key={e.id} className={`lane ${isMe(e) ? "me" : ""}`}>
                <span className="lane-no">{i + 1}</span>
                <div className={`runner ${x(e.score) > 55 ? "flip" : ""}`} style={{ left: `${x(e.score)}%` }}>
                  <Mascot name={mascotFor(cap?.symbol)} move={started ? e.score : null} size={46} className={started ? "run" : ""} />
                  <span className="tag">
                    <b>{isMe(e) ? "You" : short(e.player)}</b>
                    <i className={tone(e.score)}>{started ? pct(e.score) : cap?.symbol}</i>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const fmtNum = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(0));
