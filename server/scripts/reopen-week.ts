// Opens a Week round with the same window as an existing one at a new fee; the server hides the empty original.
// usage: KEEPER_KEY=0x... ROUND=2 FEE=1000 tsx server/scripts/reopen-week.ts
import { parseUnits } from "viem";
import { flatStreetAbi } from "../../shared/abi.ts";
import { pub, wallet, deployment } from "../src/chain.ts";

const id = BigInt(process.env.ROUND ?? "2");
const fee = parseUnits(process.env.FEE ?? "1000", 18);
const contract = { address: deployment!.address, abi: flatStreetAbi } as const;
const r = await pub.readContract({ ...contract, functionName: "getRound", args: [id] });
if (r.entryCount !== 0) throw new Error(`round ${id} already has entries`);
const hash = await wallet!.writeContract({ ...contract, functionName: "createRound", args: [r.lockTime, r.endTime, fee] });
const rc = await pub.waitForTransactionReceipt({ hash });
const count = await pub.readContract({ ...contract, functionName: "roundCount" });
console.log("new round", Number(count) - 1, "lock", r.lockTime, "end", r.endTime, rc.status, hash);
