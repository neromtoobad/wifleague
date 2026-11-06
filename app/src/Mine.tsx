import { useEffect, useState } from "react";
import { flatStreetAbi } from "../../shared/abi.ts";
import type { Ctx } from "./App.tsx";
import { api, pub, walletClient, ensureChain, fmtWif, pct, tone, roundTitle, roundDates, teamOf, mascotFor, type Entry, type Round } from "./lib.ts";
import { Mascot, Clock, LineupCard } from "./ui.tsx";

type Mine = Entry & { round: number };
type Player = { claimable: string; entries: Mine[] };

/** Every lineup the connected wallet has filed, newest first, with its card and how each pick is doing. */
export default function MyTeam({ ctx }: { ctx: Ctx }) {
  const { state, account } = ctx;
  const [me, setMe] = useState<Player | null>(null);

  useEffect(() => {
    if (!account) return setMe(null);
    api<Player>(`/api/player/${account}`).then(setMe).catch(() => {});
  }, [account, state.updatedAt]);

  if (!account) {
    return (
      <section className="empty panel">
        <Mascot name="flatty" size={140} />
        <h2 className="display">Your team lives here.</h2>
        <p>Connect the wallet you entered with to see your five.</p>
        <button className="btn lime" onClick={() => ctx.login().catch(() => {})}>
          Connect wallet
        </button>
      </section>
    );
  }
  if (!me) return <p className="hint center">Finding your lineups…</p>;
  if (!me.entries.length) {
    return (
      <section className="empty panel">
        <Mascot name="rocket" size={140} />
        <h2 className="display">No lineups yet.</h2>
        <p>Pick five Stock Tokens, make one your captain and you're on the field.</p>
        <a className="btn lime" href="#/">
          Draft your five
        </a>
      </section>
    );
  }

  const lineups = me.entries.slice().sort((a, b) => b.round - a.round || b.id - a.id);
  const rounds = new Map(state.rounds.map((r) => [r.id, r]));

  return (
    <div className="myteam">
      <div className="myteam-head">
        <h1 className="display">My team</h1>
        <span className="hint">
          {lineups.length} lineup{lineups.length > 1 ? "s" : ""}
          {me.claimable !== "0" && (
            <>
              {" "}
              · <a href="#/results">{fmtWif(me.claimable)} $WIF ready to claim →</a>
            </>
          )}
        </span>
      </div>
      {lineups.map((e) => {
        const r = rounds.get(e.round);
        return r ? <Lineup key={`${e.round}-${e.id}`} ctx={ctx} round={r} entry={e} /> : null;
      })}
    </div>
  );
}

function Lineup({ ctx, round, entry }: { ctx: Ctx; round: Round; entry: Mine }) {
  const { state, now } = ctx;
  const [msg, setMsg] = useState<string | null>(null);
  const share = `${location.origin}/s/${round.id}/${entry.id}`;
  const text = encodeURIComponent("My five are on the field at WIF League — the fantasy stock league paid in $WIF. Beat me:");
  const scored = round.returns.length > 0;

  async function refund() {
    setMsg(null);
    try {
      await ensureChain();
      const h = await walletClient(ctx.account!).writeContract({
        address: state.contract!,
        abi: flatStreetAbi,
        functionName: "refund",
        args: [BigInt(round.id), [BigInt(entry.id)]],
      });
      await pub.waitForTransactionReceipt({ hash: h });
      setMsg(`Refunded ${fmtWif(round.entryFee)} $WIF.`);
    } catch (err) {
      setMsg(((err as { shortMessage?: string }).shortMessage ?? (err as Error).message).split("\n")[0]);
    }
  }

  let status;
  if (round.status === "open")
    status = (
      <>
        <span className="tag sun">On the bench</span>
        <span className="hint">Kicks off in</span> <Clock to={round.lockTime} now={now} />
      </>
    );
  else if (round.status === "live" || round.status === "scoring")
    status = (
      <>
        <span className="tag lime">Racing</span>
        {entry.rank && (
          <b>
            #{entry.rank} of {round.entryCount} · <span className={tone(entry.score)}>{pct(entry.score)}</span>
          </b>
        )}
        {round.status === "live" && (
          <>
            <span className="hint">final bell in</span> <Clock to={round.endTime} now={now} />
          </>
        )}
      </>
    );
  else if (round.status === "settled")
    status = (
      <>
        <span className={`tag ${entry.rank && entry.rank <= 3 ? "lime" : ""}`}>{entry.rank && entry.rank <= 3 ? `Podium #${entry.rank}` : "Full time"}</span>
        <b>
          #{entry.rank} of {round.entryCount} · <span className={tone(entry.score)}>{pct(entry.score)}</span>
        </b>
      </>
    );
  else
    status = (
      <>
        <span className="tag">Called off</span>
        <button className="btn ghost" onClick={refund}>
          Get my {fmtWif(round.entryFee)} $WIF back
        </button>
      </>
    );

  return (
    <section className="panel lineup">
      <LineupCard round={round.id} entry={entry.id} />
      <div className="lineup-body">
        <div className="lineup-title">
          <h2 className="display">
            {roundTitle(round)} №{round.id}
          </h2>
          <span className="hint">
            {roundDates(round)} · paid {fmtWif(round.entryFee)} $WIF · pot {fmtWif(round.pot)}
          </span>
        </div>
        <div className="lineup-status">{status}</div>
        {msg && <p className="hint">{msg}</p>}
        <ol className="lineup-picks">
          {entry.picks.map((p, i) => {
            const a = state.assets[p];
            if (!a) return null;
            // live/settled: the round's own move from the lock price; before kick-off: today's move
            const move = scored ? round.returns[p] : a.change1d;
            const t = teamOf(a.symbol);
            return (
              <li key={p} className={i === 0 ? "cap" : ""} style={{ "--team": t.color } as React.CSSProperties}>
                <Mascot name={mascotFor(a.symbol)} move={move} size={44} />
                <span className="lp-name">
                  <b>{a.symbol}</b>
                  <i>{a.name}</i>
                </span>
                {i === 0 && <span className="lp-cap">Captain ×2</span>}
                <span className={`lp-move ${tone(move)}`}>
                  {move == null ? "—" : pct(move)}
                  <em>{scored ? "this round" : "today"}</em>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="lineup-actions">
          <a className="btn lime" href={`https://x.com/intent/post?text=${text}&url=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer">
            Post my card on X
          </a>
          <a className="btn ghost" href={`#/round/${round.id}`}>
            Round leaderboard
          </a>
        </div>
      </div>
    </section>
  );
}
