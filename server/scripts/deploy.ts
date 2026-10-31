// Deploys FlatStreet, registers every asset in shared/assets.json and writes shared/deployment.json.
// usage: RPC_URL=... DEPLOYER_KEY=0x... [OWNER=0x...] tsx server/scripts/deploy.ts
import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhood, WIF } from "../../shared/chain.ts";
import { flatStreetAbi } from "../../shared/abi.ts";

const rpc = process.env.RPC_URL ?? robinhood.rpcUrls.default.http[0];
const account = privateKeyToAccount(process.env.DEPLOYER_KEY as Hex);
const owner = (process.env.OWNER as Hex | undefined) ?? account.address;
const chain = { ...robinhood, rpcUrls: { default: { http: [rpc] } } };
const pub = createPublicClient({ chain, transport: http(rpc) });
const wallet = createWalletClient({ chain, account, transport: http(rpc) });

const artifact = JSON.parse(readFileSync(new URL("../../contracts/out/FlatStreet.sol/FlatStreet.json", import.meta.url), "utf8"));
const assets: { symbol: string; token: Hex; feed: Hex }[] = JSON.parse(
  readFileSync(new URL("../../shared/assets.json", import.meta.url), "utf8"),
);

// the deployer owns it while assets are added; ownership moves to OWNER at the end (two-step)
const hash = await wallet.deployContract({ abi: flatStreetAbi, bytecode: artifact.bytecode.object, args: [WIF, account.address] });
const receipt = await pub.waitForTransactionReceipt({ hash });
const address = receipt.contractAddress!;
console.log("FlatStreet", address, "block", receipt.blockNumber);

for (const a of assets) {
  const tx = await wallet.writeContract({ address, abi: flatStreetAbi, functionName: "addAsset", args: [a.token, a.feed, a.symbol] });
  await pub.waitForTransactionReceipt({ hash: tx });
  console.log("  +", a.symbol);
}
await pub.waitForTransactionReceipt({
  hash: await wallet.writeContract({ address, abi: flatStreetAbi, functionName: "setKeeper", args: [account.address] }),
});
if (owner.toLowerCase() !== account.address.toLowerCase()) {
  await pub.waitForTransactionReceipt({
    hash: await wallet.writeContract({ address, abi: flatStreetAbi, functionName: "transferOwnership", args: [owner] }),
  });
  console.log("ownership offered to", owner, "(accept with acceptOwnership)");
}

const out = new URL(`../../shared/deployment${process.env.DEPLOY_TAG ? "." + process.env.DEPLOY_TAG : ""}.json`, import.meta.url);
writeFileSync(out, JSON.stringify({ address, startBlock: Number(receipt.blockNumber), chainId: await pub.getChainId() }, null, 1));
console.log("wrote", out.pathname);
