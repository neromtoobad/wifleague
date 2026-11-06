# WIF League: submission text

Paste these into the worldisflat.fun/build project page. Edits lock at **Nov 12, 17:30 UTC**; only the logo can change after that.

## Name
WIF League

## Tagline
Pick 5 stocks, pay in $WIF. Chainlink keeps score and every pot burns $WIF.

## Categories
Stock Tokens · games · onboarding

## Links
- Live app: https://wifleague.nerom.site
- Repo (public): https://github.com/neromtoobad/wifleague
- Contract (verified): https://robinhoodchain.blockscout.com/address/0x57278efe62b9e0b0b20f2504f4fdb1d5df4f90c6?tab=contract
- Demo video: _add link_
- X thread: _add link_

## Description

WIF League is fantasy sports where the players are Stock Tokens. You draft five of the 35 Stock Tokens and ETFs on Robinhood Chain that have a Chainlink feed, make one of them your captain (it counts double), and enter with $WIF. The market plays the match.

There are two games on a loop:
- **The Sprint**: one trading day, bell to bell, 1,000 $WIF a lineup.
- **The Week**: Monday to Friday's close, 1,000 $WIF a lineup.

When a round ends the contract pays the pot out by itself: 50 / 30 / 20 to the top three, 10% burned with $WIF's own `burn()`, and 10% rolled into the next pot. Winners can swap their $WIF straight into a real Stock Token like NVDA through KyberSwap's Robinhood Chain router, without leaving the app.

**How $WIF is used onchain.** Every entry and every sponsorship is a $WIF transfer into the league contract. Every settle burns 10% of the pot through `WIF.burn()` and rolls 10% forward. Prizes and referral cuts are paid in $WIF.

**The flywheel.**
- A new round every trading day and every week gives people a reason to come back daily.
- Every lineup is a share card for X with the player's mascots and score. Its link carries a referral, and referred entries pay 5% of their fee to whoever shared it.
- Rollover makes each pot start bigger than zero.
- Anyone can `sponsor()` a round. A project on Robinhood Chain can put $WIF behind a week to bring its own community in.
- Each settle takes $WIF out of supply.

**Why the scores can't be gamed.** Most price games read a pool's spot price, which one big swap can move, or let whoever calls settle pick the moment. WIF League does neither. `lock()` and `finish()` take a Chainlink round id for each asset, and the contract checks that the round was the one live at the exact lock or closing time. Nobody can pick a better price. Feeds older than 4 days are rejected, and if a round can't be priced within 7 days, anyone can cancel it and every entrant gets a full refund. The owner can list assets and schedule rounds. There is no function that withdraws the pot.

**What makes it a game.** Each of the 35 tickers has its own mascot (an apple, a GPU, a red EV, an oil barrel…). Mascots belong to eight teams, hop when their stock is up and shiver when it's down. Live rounds are a race track where each lineup's captain runs by score, and results end on a podium next to the $WIF burn furnace.

**Built with:** Solidity 0.8.26 + OpenZeppelin 5 (Foundry; unit tests plus a fork test that runs a full round against live Robinhood Chain state), Chainlink Data Feeds, a Hono + viem server with a keeper that opens, locks and settles rounds, React + Vite, KyberSwap aggregator.

**Stock Tokens rules.** The swap into Stock Tokens is switched off for U.S. persons and the countries on Robinhood's restricted list (IP check plus a self-certification). WIF League is independent and not affiliated with Robinhood Markets, Inc.

## Real transactions
- Contract deploy: block 102498314
- Rounds opened, locked and settled by the keeper: see the contract's transactions on Blockscout
- Player entries: _add the first entry tx hashes_
