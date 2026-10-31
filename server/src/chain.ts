import { readFileSync, existsSync } from "node:fs";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhood } from "../../shared/chain.ts";

export const RPC_URL = process.env.RPC_URL ?? robinhood.rpcUrls.default.http[0];

const deploymentFile = new URL(
  `../../shared/deployment${process.env.DEPLOY_TAG ? "." + process.env.DEPLOY_TAG : ""}.json`,
  import.meta.url,
);
export const deployment: { address: Hex; startBlock: number; chainId: number } | null =
  process.env.CONTRACT
    ? { address: process.env.CONTRACT as Hex, startBlock: Number(process.env.START_BLOCK ?? 0), chainId: 4663 }
    : existsSync(deploymentFile)
      ? JSON.parse(readFileSync(deploymentFile, "utf8"))
      : null;

const chain = { ...robinhood, rpcUrls: { default: { http: [RPC_URL] } } };

export const pub = createPublicClient({
  chain,
  transport: http(RPC_URL, { timeout: 20_000, retryCount: 3 }),
  batch: { multicall: { batchSize: 2048, wait: 16 } },
});

export const keeperAccount = process.env.KEEPER_KEY ? privateKeyToAccount(process.env.KEEPER_KEY as Hex) : null;
export const wallet = keeperAccount ? createWalletClient({ chain, account: keeperAccount, transport: http(RPC_URL) }) : null;
