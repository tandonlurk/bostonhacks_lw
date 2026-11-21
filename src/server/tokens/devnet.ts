// Optional SPL mirror. Ledger is authoritative; this module never changes its delta.
import { createHash } from "node:crypto";
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, createMintToCheckedInstruction, getAssociatedTokenAddressSync, getMint } from "@solana/spl-token";
import { getSql, hasDb } from "@/server/db";
import { memoryGame } from "@/server/points/state";

export const DEVNET_RPC = "https://api.devnet.solana.com";
export interface MintJob { ref: string; txSignature: string; signedTransaction: string; lastValidBlockHeight: number }
export interface MintTransport {
  prepare(ref: string, amount: number): Promise<MintJob>;
  status(signature: string): Promise<"confirmed" | "pending" | "failed">;
  blockHeight(): Promise<number>;
  send(signedTransaction: string): Promise<void>;
}
interface DevnetConfig { authority: Keypair; mint: PublicKey; owner: PublicKey }
export function readDevnetConfig(): DevnetConfig | null {
  if (process.env.SOLANA_DEVNET_ENABLED !== "1") return null;
  try {
    const bytes: unknown = JSON.parse(process.env.SOLANA_DEVNET_AUTHORITY_SECRET ?? "null");
    if (!Array.isArray(bytes) || bytes.length !== 64 || !bytes.every(n => Number.isInteger(n) && n >= 0 && n <= 255)) return null;
    return { authority: Keypair.fromSecretKey(Uint8Array.from(bytes)), mint: new PublicKey(process.env.SOLANA_DEVNET_MINT!), owner: new PublicKey(process.env.SOLANA_DEVNET_RECIPIENT!) };
  } catch { return null; }
}
function base58(bytes: Uint8Array): string {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let value = BigInt(`0x${Buffer.from(bytes).toString("hex") || "0"}`); let encoded = "";
  while (value > BigInt(0)) { encoded = alphabet[Number(value % BigInt(58))] + encoded; value /= BigInt(58); }
  for (const byte of bytes) { if (byte !== 0) break; encoded = "1" + encoded; }
  return encoded;
}
export function buildMintJob(config: DevnetConfig, ref: string, amount: number, blockhash: string, lastValidBlockHeight: number): MintJob {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Invalid devnet mirror amount.");
  const account = getAssociatedTokenAddressSync(config.mint, config.owner);
  const transaction = new Transaction({ feePayer: config.authority.publicKey, blockhash, lastValidBlockHeight }).add(
    createAssociatedTokenAccountIdempotentInstruction(config.authority.publicKey, account, config.owner, config.mint),
    createMintToCheckedInstruction(config.mint, account, config.authority.publicKey, BigInt(amount), 0),
    new TransactionInstruction({ programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"), keys: [],
      data: Buffer.from(`TCity-devnet:${createHash("sha256").update(ref).digest("hex")}`) }),
  );
  transaction.sign(config.authority);
  return { ref, txSignature: base58(transaction.signature!), signedTransaction: transaction.serialize().toString("base64"), lastValidBlockHeight };
}
function rpcTransport(config: DevnetConfig): MintTransport {
  const connection = new Connection(DEVNET_RPC, { commitment: "confirmed", disableRetryOnRateLimit: true,
    fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(2500) }) });
  return {
    async prepare(ref, amount) {
      const mint = await getMint(connection, config.mint);
      if (mint.decimals !== 0 || !mint.mintAuthority?.equals(config.authority.publicKey)) throw new Error("Devnet mint configuration mismatch.");
      const latest = await connection.getLatestBlockhash();
      return buildMintJob(config, ref, amount, latest.blockhash, latest.lastValidBlockHeight);
    },
    async status(signature) {
      const result = (await connection.getSignatureStatuses([signature], { searchTransactionHistory: true })).value[0];
      if (result?.err) return "failed";
      return result?.confirmationStatus === "confirmed" || result?.confirmationStatus === "finalized" ? "confirmed" : "pending";
    },
    blockHeight: () => connection.getBlockHeight(),
    async send(signedTransaction) { await connection.sendRawTransaction(Buffer.from(signedTransaction, "base64"), { maxRetries: 0 }); },
  };
}
/** Never regenerate an expired/uncertain job: manual review is safer than a second mint. */
export async function submitMintJob(job: MintJob, transport: MintTransport): Promise<"confirmed" | "pending" | "failed" | "expired"> {
  const prior = await transport.status(job.txSignature);
  if (prior !== "pending") return prior;
  if (await transport.blockHeight() > job.lastValidBlockHeight) return "expired";
  await transport.send(job.signedTransaction);
  return transport.status(job.txSignature);
}
const shared = globalThis as unknown as { __tcityMintJobs?: Map<string, MintJob>; __tcityMintRuns?: Map<string, Promise<void>> };
function memoryJobs() { return shared.__tcityMintJobs ??= new Map<string, MintJob>(); }
async function sync(riderId: string, transport: MintTransport) {
  const rows = hasDb()
    ? await getSql()<{ ref: string; delta: number }[]>`select ref, delta from token_ledger where rider_id=${riderId} and delta>0 and tx_signature is null order by id limit 3`
    : memoryGame().tokens.filter(t => t.riderId === riderId && t.delta > 0 && !t.txSignature).slice(0, 3);
  for (const row of rows) {
    let job: MintJob | undefined;
    if (hasDb()) {
      const [saved] = await getSql()`select ref,tx_signature,signed_transaction,last_valid_block_height from token_mint_jobs where ref=${row.ref}`;
      if (saved) job = { ref: saved.ref, txSignature: saved.tx_signature, signedTransaction: saved.signed_transaction, lastValidBlockHeight: Number(saved.last_valid_block_height) };
    } else job = memoryJobs().get(row.ref);
    if (!job) {
      const candidate = await transport.prepare(row.ref, row.delta);
      if (hasDb()) {
        await getSql()`insert into token_mint_jobs (ref,tx_signature,signed_transaction,last_valid_block_height)
          values (${candidate.ref},${candidate.txSignature},${candidate.signedTransaction},${candidate.lastValidBlockHeight}) on conflict do nothing`;
        const [saved] = await getSql()`select ref,tx_signature,signed_transaction,last_valid_block_height from token_mint_jobs where ref=${row.ref}`;
        if (!saved) continue; // Rider/reset removed the ledger row while the transaction was prepared.
        job = { ref: saved.ref, txSignature: saved.tx_signature, signedTransaction: saved.signed_transaction, lastValidBlockHeight: Number(saved.last_valid_block_height) };
      } else { job = memoryJobs().get(row.ref) ?? candidate; memoryJobs().set(row.ref, job); }
    }
    if (await submitMintJob(job, transport) === "confirmed") {
      if (hasDb()) await getSql().begin(async sql => {
        await sql`update token_mint_jobs set confirmed=true where ref=${job!.ref}`;
        await sql`update token_ledger set tx_signature=${job!.txSignature} where ref=${job!.ref} and tx_signature is null`;
      });
      else { const entry = memoryGame().tokens.find(t => t.ref === job!.ref); if (entry) entry.txSignature = job.txSignature; }
    }
  }
}
/** Called after a wallet response; callers can poll later for confirmed signatures. */
export async function mirrorPendingAwards(riderId: string, transportOverride?: MintTransport): Promise<void> {
  const config = readDevnetConfig();
  if (!config && !transportOverride) return;
  const runs = shared.__tcityMintRuns ??= new Map<string, Promise<void>>();
  if (runs.has(riderId)) return runs.get(riderId);
  const run = sync(riderId, transportOverride ?? rpcTransport(config!)).catch(() => {
    // No secret-bearing RPC error objects in logs; ledger and pending job remain intact.
    console.warn("[tokens] Devnet mirror unavailable; earned CitiTokens are unaffected.");
  });
  runs.set(riderId, run);
  try { await run; } finally { runs.delete(riderId); }
}
