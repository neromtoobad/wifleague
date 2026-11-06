# WIF League

**The fantasy stock league paid in $WIF.** Draft five Stock Tokens on Robinhood Chain, enter with $WIF, and the market is the scoreboard. Prices come from Chainlink, settlement is onchain, and 10% of every pot is burned.

Built for the [World is Flat hackathon](https://worldisflat.fun/build). Categories: Stock Tokens, games, onboarding.

## How a round works

1. **Draft five** of the 35 Stock Tokens and ETFs on Robinhood Chain that have a Chainlink feed (NVDA, TSLA, PLTR, GME, SPY, QQQ, GLD…). Your first pick is the **captain** and counts double.
2. **Enter with $WIF.**
   - **The Week** runs from Monday 00:00 UTC to Friday's closing bell; entry is 1,000 $WIF.
   - **The Sprint** runs each weekday from the opening bell to the close; entry is 1,000 $WIF.
   - Each wallet can file up to 3 lineups per round.
3. **Score** = (2 × captain return + the other four) / 6, using the Chainlink price at the exact lock and end times.
4. **Settle.**
   - 80% goes to the top three (50 / 30 / 20).
   - 10% is **burned** through $WIF's own `burn()`.
   - 10% **rolls into the next pot**.
   - Referred entries pay 5% of their fee to the person who shared the link.
5. **Take it as a stock.** Winners claim $WIF, and the app can swap it straight into a real Stock Token through KyberSwap's Robinhood Chain router.

## The flywheel

```
new round every trading day + every week
        │
        ▼
entries buy $WIF ──► pot ──► 10% burned (supply ↓)
        ▲              ├──► 10% rollover (next pot ↑)
        │              └──► winners (can swap into real stocks)
shared lineup cards (X) + 5% referrals + sponsored pots
```

- A new round every trading day and every week gives players a reason to come back.
- Every entry needs $WIF.
- Every settle burns part of the pot.
- The rollover makes the next pot bigger than the last.
- Each lineup is a share card for X, and each card's link carries a referral.
- Anyone can `sponsor()` a round. A project on Robinhood Chain can put $WIF behind a week to bring its own community in.

## Why the scoring can't be gamed

Other score-by-price games read a pool's spot price, which one large swap can move, or let whoever calls `settle` choose the moment. WIF League does neither.

- `lock()` and `finish()` take a **Chainlink round id hint per asset**. The contract checks that this round was published at or before the deadline, and that the next round was published after it (or doesn't exist yet).
- So the start and end prices are fixed by the clock. They don't depend on who calls the function or when.
- Feeds older than 4 days are rejected.
- If a round can't be priced within 7 days of its deadline, anyone can `cancel()` it, and every entrant refunds their full fee.
- The owner can only list assets, set the keeper and schedule rounds. **There is no function that withdraws pot funds.**

## Repo

| Path | What |
|---|---|
| `contracts/src/FlatStreet.sol` | The league contract (Solidity 0.8.26, OpenZeppelin 5) |
| `contracts/test/` | 8 unit tests + a fork test that runs a full round against live Robinhood Chain state (real $WIF burn, real Chainlink feeds) |
| `server/` | Node + Hono: chain indexer, live scoring, keeper (create → lock → finish → settle), PNG share cards (resvg) |
| `app/` | Vite + React + viem frontend |
| `shared/` | ABI, chain config, asset registry (token + Chainlink feed per ticker) |

## Run it

```bash
pnpm install
cd contracts && forge test                      # unit tests
forge test --match-contract Fork                # full round on a live-chain fork
```

```bash
# local stack on an anvil fork
anvil --fork-url https://rpc.mainnet.chain.robinhood.com --chain-id 4663 --port 8546
RPC_URL=http://127.0.0.1:8546 DEPLOYER_KEY=<anvil key> DEPLOY_TAG=local tsx server/scripts/deploy.ts
RPC_URL=http://127.0.0.1:8546 DEPLOY_TAG=local KEEPER_KEY=<anvil key> tsx server/src/index.ts
FS_API=http://localhost:8787 VITE_RPC=http://127.0.0.1:8546 vite --config app/vite.config.ts
```

## Addresses (Robinhood Chain, 4663)

| | |
|---|---|
| $WIF | `0x5173b8eA6923c2d40267890D45C46a3480954773` |
| League contract (`FlatStreet`) | [`0x57278efe62b9e0b0b20f2504f4fdb1d5df4f90c6`](https://robinhoodchain.blockscout.com/address/0x57278efe62b9e0b0b20f2504f4fdb1d5df4f90c6?tab=contract) (verified) |
| Stock Tokens + feeds | [`shared/assets.json`](shared/assets.json) (from the Robinhood Chain token registry and Chainlink's feed list) |

---

WIF League is an independent project. It is not affiliated with, endorsed by, or sponsored by Robinhood Markets, Inc. $WIF is a memecoin with no promise of value or return. Stock Tokens carry market risk and are restricted in some countries.
