import { parseUnits } from "viem";
import { flatStreetAbi } from "../../shared/abi.ts";
import { pub, wallet, keeperAccount, deployment } from "./chain.ts";
import { hintsAt } from "./feeds.ts";
import { state, refreshRounds } from "./state.ts";

// Schedule (US equities, EST from Nov 1): the Week locks Monday 00:00 UTC and ends at Friday's closing
// bell (21:00 UTC); a Sprint runs each weekday from the opening bell (14:30) to the close (21:00).
const WEEK_FEE = parseUnits(process.env.WEEK_FEE ?? "5000", 18);
const SPRINT_FEE = parseUnits(process.env.SPRINT_FEE ?? "1000", 18);
const DAY = 86_400;

export function nextWeek(now: number) {
  const d = new Date(now * 1000);
  const daysToMon = (8 - d.getUTCDay()) % 7 || 7;
  const lock = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysToMon) / 1000;
  return { lock, end: lock + 4 * DAY + 21 * 3600 };
}

export function nextSprint(now: number) {
  for (let i = 0; i < 8; i++) {
    const d = new Date((now + i * DAY) * 1000);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000;
    const lock = midnight + 14 * 3600 + 30 * 60;
    if (lock > now + 600) return { lock, end: midnight + 21 * 3600 };
  }
  throw new Error("no sprint slot");
}

const log = (...a: unknown[]) => console.log(new Date().toISOString(), "[keeper]", ...a);

async function send(functionName: string, args: readonly unknown[]) {
  if (!wallet || !deployment) return;
  const hash = await wallet.writeContract({
    address: deployment.address,
    abi: flatStreetAbi,
    functionName: functionName as never,
    args: args as never,
  });
  const r = await pub.waitForTransactionReceipt({ hash });
  log(functionName, args.map(String).join(","), r.status, hash);
}

let busy = false;
export async function tick() {
  if (!wallet || !keeperAccount || !deployment || busy) return;
  busy = true;
  try {
    await refreshRounds();
    const block = await pub.getBlock();
    const now = Number(block.timestamp);
    const feeds = state.assets.map((a) => a.feed);

    for (const r of state.rounds) {
      if (r.status === "open" && now >= r.lockTime) {
        // an empty round just cancels inside lock(), so skip the 35 feed lookups and the calldata
        const hints = r.entryCount === 0 ? [] : await hintsAt(feeds.slice(0, r.assetCount), BigInt(r.lockTime));
        await send("lock", [BigInt(r.id), hints]);
      } else if (r.status === "live" && now >= r.endTime) {
        await send("finish", [BigInt(r.id), await hintsAt(feeds.slice(0, r.assetCount), BigInt(r.endTime))]);
      }
    }
    await refreshRounds();
    for (const r of state.rounds.filter((r) => r.status === "scoring")) await send("settle", [BigInt(r.id), 500n]);

    const upcoming = (kind: "week" | "sprint") => state.rounds.some((r) => r.kind === kind && r.status === "open" && r.lockTime > now);
    if (!upcoming("week")) {
      const w = nextWeek(now);
      await send("createRound", [BigInt(w.lock), BigInt(w.end), WEEK_FEE]);
    }
    if (!upcoming("sprint")) {
      const s = nextSprint(now);
      await send("createRound", [BigInt(s.lock), BigInt(s.end), SPRINT_FEE]);
    }
    await refreshRounds();
  } catch (e) {
    log("error", (e as Error).message.split("\n")[0]);
  } finally {
    busy = false;
  }
}
