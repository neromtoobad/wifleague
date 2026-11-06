import { useCallback, useEffect, useState } from "react";
import { isAddress, type Hex } from "viem";
import { api, connect, short, fmtWif, usd, wif, pct, tone, mascotFor, type State } from "./lib.ts";
import { Mascot } from "./ui.tsx";
import Draft from "./Draft.tsx";
import RoundView from "./RoundView.tsx";
import Results from "./Results.tsx";
import How from "./How.tsx";
import MyTeam from "./Mine.tsx";

export type Ctx = {
  state: State;
  account: Hex | null;
  now: number;
  login: () => Promise<Hex>;
  refresh: () => Promise<void>;
  go: (hash: string) => void;
};

function useHash() {
  const [hash, setHash] = useState(location.hash || "#/");
  useEffect(() => {
    const on = () => {
      setHash(location.hash || "#/");
      window.scrollTo({ top: 0 });
    };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return hash;
}

// a referral link (?ref=0x…) sticks to this browser until the visitor enters a round
const ref = new URLSearchParams(location.search).get("ref");
if (ref && isAddress(ref)) localStorage.setItem("fs.ref", ref);

export default function App() {
  const hash = useHash();
  const [state, setState] = useState<State | null>(null);
  const [account, setAccount] = useState<Hex | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await api<State>("/api/state"));
    } catch {
      /* next poll */
    }
  }, []);

  useEffect(() => {
    refresh();
    const a = setInterval(refresh, 15_000);
    const b = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => (clearInterval(a), clearInterval(b));
  }, [refresh]);

  useEffect(() => {
    window.ethereum
      ?.request({ method: "eth_accounts" })
      .then((a) => (a as Hex[])[0] && setAccount((a as Hex[])[0]))
      .catch(() => {});
    const on = (a: unknown) => setAccount(((a as Hex[])[0] as Hex) ?? null);
    window.ethereum?.on?.("accountsChanged", on);
    return () => window.ethereum?.removeListener?.("accountsChanged", on);
  }, []);

  const login = useCallback(async () => {
    try {
      const a = await connect();
      setAccount(a);
      setErr(null);
      return a;
    } catch (e) {
      setErr((e as Error).message);
      throw e;
    }
  }, []);

  const go = (h: string) => (location.hash = h);
  const route = hash.replace(/^#/, "");

  if (!state || !state.assets.length) {
    return (
      <div className="boot">
        <Mascot name="flatty" size={160} className="flatty" />
        <p className="display">Warming up the stadium…</p>
      </div>
    );
  }

  const ctx: Ctx = { state, account, now, login, refresh, go };
  const live = state.rounds.filter((r) => r.status === "live");
  const burnedUsd = wif(state.totalBurned) * state.wifUsd;

  let page;
  const m = route.match(/^\/round\/(\d+)/);
  if (m) page = <RoundView ctx={ctx} id={Number(m[1])} />;
  else if (route.startsWith("/live")) page = live.length ? <RoundView ctx={ctx} id={live[0].id} /> : <NoLive ctx={ctx} />;
  else if (route.startsWith("/results")) page = <Results ctx={ctx} />;
  else if (route.startsWith("/how")) page = <How ctx={ctx} />;
  else if (route.startsWith("/me")) page = <MyTeam ctx={ctx} />;
  else page = <Draft ctx={ctx} />;

  const tab = (h: string, label: string, active: boolean, n = 0) => (
    <a href={h} className={active ? "on" : ""}>
      {label}
      {n > 0 && <span className="dot">{n}</span>}
    </a>
  );

  return (
    <>
      <header className="top">
        <a href="#/" className="logo">
          <Mascot name="flatty" size={44} />
          <span className="display">
            WIF<span>League</span>
          </span>
        </a>
        <nav className="nav">
          {tab("#/", "Draft", route === "/" || route === "")}
          {tab("#/live", "Live", route.startsWith("/live") || !!m, live.length)}
          {tab("#/me", "My team", route.startsWith("/me"))}
          {tab("#/results", "Results", route.startsWith("/results"))}
          {tab("#/how", "How to play", route.startsWith("/how"))}
        </nav>
        <div className="top-right">
          <span className="wif-chip" title="$WIF price and total burned by WIF League">
            <b>$WIF</b> {state.wifUsd ? `$${state.wifUsd.toFixed(5)}` : "—"}
            <i>{fmtWif(state.totalBurned)} burned{burnedUsd > 1 ? ` · ${usd(burnedUsd)}` : ""}</i>
          </span>
          {account ? (
            <a className="btn ghost" href="#/me" title="My team">
              {short(account)}
            </a>
          ) : (
            <button className="btn lime" onClick={() => login().catch(() => {})}>
              Connect
            </button>
          )}
        </div>
      </header>
      <Tape state={state} />
      {err && (
        <div className="notice" onClick={() => setErr(null)}>
          {err}
        </div>
      )}
      <main>{page}</main>
      <footer className="foot">
        <span>
          WIF League is an independent project built on Robinhood Chain for the World is Flat hackathon. Not affiliated with Robinhood Markets, Inc.
          $WIF is a memecoin with no promise of value. Stock Tokens carry market risk and are not offered to U.S. persons or in{" "}
          <a href="https://docs.robinhood.com/rhj/restricted-jurisdictions" target="_blank" rel="noreferrer">
            restricted countries
          </a>
          .
        </span>
        {state.contract && (
          <a href={`https://robinhoodchain.blockscout.com/address/${state.contract}`} target="_blank" rel="noreferrer">
            Contract {short(state.contract)} ↗
          </a>
        )}
      </footer>
    </>
  );
}

function Tape({ state }: { state: State }) {
  const items = state.assets.map((a) => (
    <span key={a.symbol} className="tape-item">
      <Mascot name={mascotFor(a.symbol)} move={a.change1d} size={22} />
      <b>{a.symbol}</b> {a.price.toFixed(2)} <i className={tone(a.change1d)}>{a.change1d == null ? "" : `${a.change1d >= 0 ? "▲" : "▼"} ${pct(a.change1d).slice(1)}`}</i>
    </span>
  ));
  return (
    <div className="tape" aria-label="Live Chainlink prices">
      <div className="tape-run">
        {items}
        {items}
      </div>
    </div>
  );
}

function NoLive({ ctx }: { ctx: Ctx }) {
  const next = ctx.state.rounds.filter((r) => r.status === "open").sort((a, b) => a.lockTime - b.lockTime)[0];
  return (
    <section className="empty panel">
      <Mascot name="rocket" size={140} />
      <h2 className="display">Nobody's on the track yet.</h2>
      <p>Races start at the lock. {next ? "The next one starts soon, so get your five in." : ""}</p>
      <a className="btn lime" href="#/">
        Draft your five
      </a>
    </section>
  );
}
