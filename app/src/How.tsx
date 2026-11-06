import type { Ctx } from "./App.tsx";
import { short, TEAMS, mascotFor } from "./lib.ts";
import { Mascot } from "./ui.tsx";

export default function How({ ctx }: { ctx: Ctx }) {
  const c = ctx.state.contract;
  const steps: [string, string, string][] = [
    ["flatty", "Draft five", `Pick five of the ${ctx.state.assets.length} Stock Tokens and ETFs on Robinhood Chain that have a Chainlink price feed. Your first pick is the captain, and its move counts double.`],
    ["coin", "Enter with $WIF", "The Week runs Monday to Friday's closing bell. The Sprint runs one trading day, bell to bell. Pick your stake: 1K, 10K or 100K $WIF, and each stake is its own league with its own pot. Your entry goes straight into the pot the contract holds. Up to three lineups per wallet."],
    ["rocket", "The market plays", "Your score is the average move of your five, captain counted twice. Start and end prices are the Chainlink rounds that were current at the exact lock and closing times, checked onchain."],
    ["golem", "The pot pays out", "80% to the top three (50 / 30 / 20). 10% burned with $WIF's own burn(). 10% rolls into the next pot. A referred entry pays 5% of its fee to whoever shared the link."],
    ["bull", "Take it as a stock", "Winners claim $WIF and can swap it straight into a real Stock Token like NVDA, routed by KyberSwap on Robinhood Chain."],
  ];
  return (
    <article className="how">
      <section className="hero">
        <div className="hero-main">
          <h1 className="display hero-title">
            Fantasy sports,
            <br />
            <span className="hl">but the players are stocks.</span>
          </h1>
          <p className="hero-sub">Anyone, anywhere, can draft a lineup of real Stock Tokens. The scoreboard is the market itself.</p>
        </div>
        <div className="hero-art">
          <Mascot name="flatty" size={200} className="flatty" />
        </div>
      </section>

      <ol className="comic">
        {steps.map(([m, t, body], i) => (
          <li key={t} className="panel">
            <span className="step-no">{i + 1}</span>
            <Mascot name={m} size={110} move={1} />
            <h3 className="display">{t}</h3>
            <p>{body}</p>
          </li>
        ))}
      </ol>

      <section className="panel roster">
        <div className="panel-head">
          <h3 className="display">The teams</h3>
          <span className="hint">Every ticker has its own mascot and plays for one team. Mascots hop when their stock is up and shiver when it's down.</span>
        </div>
        <div className="roster-grid">
          {TEAMS.map((t) => (
            <div key={t.key} className="roster-team" style={{ "--team": t.color } as React.CSSProperties}>
              <Mascot name={t.mascot} size={64} />
              <b>{t.name}</b>
              <span className="roster-players">
                {t.tickers
                  .filter((s) => ctx.state.assets.some((a) => a.symbol === s))
                  .map((s) => (
                    <span key={s} title={s}>
                      <Mascot name={mascotFor(s)} size={30} />
                      <small>{s}</small>
                    </span>
                  ))}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="how-grid">
        <section className="panel">
          <h3 className="display">Why it loops</h3>
          <p>
            New rounds every trading day and every week. Every entry needs $WIF, every settle burns some, every rollover makes the next pot bigger, and
            every shared lineup card brings in a new player. Anyone can also sponsor a round: a team on Robinhood Chain can put $WIF behind a week to
            bring its own community in.
          </p>
        </section>
        <section className="panel trust">
          <h3 className="display">No keys to the pot</h3>
          <p>
            The owner can list new assets and schedule rounds, nothing else. There is no withdraw function. If a round can't be priced within 7 days,
            anyone can call it off and every entrant gets a full refund.{" "}
            {c && (
              <a href={`https://robinhoodchain.blockscout.com/address/${c}`} target="_blank" rel="noreferrer">
                Read the contract {short(c)} ↗
              </a>
            )}
          </p>
        </section>
      </div>
    </article>
  );
}
