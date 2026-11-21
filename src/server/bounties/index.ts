import { randomUUID } from "node:crypto";
import type { TransactionSql } from "postgres";
import type { BountyAction, BountyMutationResponse, BountyPost, BountiesResponse, CreateBountyRequest, PlayableTeamId } from "@/contracts";
import { isTeamRouteId } from "@/contracts";
import { getSql, hasDb } from "@/server/db";
import { GAME_LOCK } from "@/server/points";
import { memoryGame } from "@/server/points/state";
import { ScoringError } from "@/server/points/rules";

type StoredPost = BountyPost & { requestId: string };
interface Identity { id: string; displayName: string; team: PlayableTeamId }
interface Transfer { riderId: string; delta: number; ref: string; reason: string }
const shared = globalThis as unknown as { __tcityBounties?: Map<string, StoredPost>; __tcityBountiesSeeded?: boolean };
function postsMemory() { return shared.__tcityBounties ??= new Map(); }
function publicPost({ requestId: _requestId, ...post }: StoredPost): BountyPost { void _requestId; return post; }
function invalid(code: string, message: string, status = 400): never { throw new ScoringError(code, message, status); }
function riderId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 200) invalid("invalid_post", "Choose a rider before using the board.");
}
function field(value: unknown, name: string, max: number, optional = false): string | undefined {
  if (optional && (value == null || value === "")) return undefined;
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) invalid("invalid_post", `${name} must be 1–${max} characters.`);
  return value.trim();
}
function validateCreate(input: CreateBountyRequest): CreateBountyRequest {
  if (!input || typeof input !== "object") invalid("invalid_post", "Provide the post details.");
  riderId(input.riderId);
  const requestId = field(input.requestId, "Request ID", 100)!;
  if (!["bounty", "trade", "offer"].includes(input.kind)) invalid("invalid_post", "Choose bounty, trade, or offer.");
  if (!Number.isSafeInteger(input.rewardTokens) || input.rewardTokens < 0 || input.rewardTokens > 1000) invalid("invalid_post", "Tokens must be a whole number from 0 to 1000.");
  return { riderId: input.riderId, requestId, kind: input.kind, rewardTokens: input.rewardTokens, title: field(input.title, "Title", 80)!, body: field(input.body, "Details", 500)!, have: field(input.have, "What you have", 80, input.kind !== "trade"), want: field(input.want, "What you want", 80, input.kind !== "trade"), station: field(input.station, "Station", 80, true) };
}
function identityMemory(id: string): Identity {
  const rider = memoryGame().riders.get(id);
  if (!rider) invalid("rider_not_found", "Join a line before using the board.", 404);
  if (rider.isSimulated) invalid("invalid_post", "Join with your own rider profile to use the board. Simulator riders reset with the demo.");
  if (!isTeamRouteId(rider.homeTeamRouteId)) invalid("invalid_post", "Pick a Red, Orange, Blue, or Green home team before posting.");
  return { id, displayName: rider.displayName, team: rider.homeTeamRouteId as PlayableTeamId };
}
async function identityDb(sql: TransactionSql, id: string): Promise<Identity> {
  const [rider] = await sql`select id,display_name,home_team_route_id,is_simulated from riders where id=${id}`;
  if (!rider) invalid("rider_not_found", "Join a line before using the board.", 404);
  if (rider.is_simulated) invalid("invalid_post", "Join with your own rider profile to use the board. Simulator riders reset with the demo.");
  if (!isTeamRouteId(rider.home_team_route_id)) invalid("invalid_post", "Pick a Red, Orange, Blue, or Green home team before posting.");
  return { id, displayName: rider.display_name, team: rider.home_team_route_id };
}
function balanceMemory(id: string) { return memoryGame().tokens.filter(t => t.riderId === id).reduce((sum, t) => sum + t.delta, 0); }
async function balanceDb(sql: TransactionSql, id: string) {
  const [wallet] = await sql`select coalesce(sum(delta),0)::int as balance from token_ledger where rider_id=${id}`;
  return wallet.balance as number;
}
function debitAvailable(balance: number, amount: number) { if (balance < amount) invalid("insufficient_tokens", "You need more CitiTokens for this post.", 409); }
function move(post: StoredPost, rider: Identity, action: BountyAction, balance: number): { post: StoredPost; transfers: Transfer[] } {
  const transfers: Transfer[] = [];
  const next = { ...post };
  const add = (id: string, amount: number, suffix: string, reason: string) => { if (amount) transfers.push({ riderId: id, delta: amount, ref: `board:${post.id}:${suffix}`, reason }); };
  if (action === "claim") {
    if (rider.id === post.authorId) invalid("self_claim", "You can’t claim your own post.", 403);
    if (post.status === "reserved" && post.claimantId === rider.id) return { post, transfers };
    if (post.status !== "open") invalid("post_unavailable", "This post is no longer open.", 409);
    if (post.kind === "offer") {
      debitAvailable(balance, post.rewardTokens);
      // Each reservation can be released and reclaimed. Random nonce prevents colliding ledger refs.
      add(rider.id, -post.rewardTokens, `reserve:${randomUUID()}`, `board:hold:${post.id}`);
    }
    next.status = "reserved"; next.claimantId = rider.id; next.claimantName = rider.displayName;
  } else if (action === "complete") {
    if (rider.id !== post.authorId) invalid("not_author", "Only the author can confirm delivery.", 403);
    if (post.status === "completed") return { post, transfers };
    if (post.status !== "reserved" || !post.claimantId) invalid("post_unavailable", "A rider must claim this post before delivery can be confirmed.", 409);
    add(post.kind === "offer" ? post.authorId : post.claimantId, post.rewardTokens, "payout", `board:delivery:${post.id}`);
    next.status = "completed";
  } else if (action === "cancel") {
    if (rider.id !== post.authorId) invalid("not_author", "Only the author can take down this post.", 403);
    if (post.status === "cancelled") return { post, transfers };
    if (post.status === "completed") invalid("post_unavailable", "Completed deliveries are final.", 409);
    if (post.kind !== "offer") add(post.authorId, post.rewardTokens, "cancel-refund", `board:refund:${post.id}`);
    else if (post.status === "reserved" && post.claimantId) add(post.claimantId, post.rewardTokens, `cancel-refund:${randomUUID()}`, `board:refund:${post.id}`);
    next.status = "cancelled";
  } else if (action === "release") {
    if (post.status === "open") return { post, transfers };
    if (rider.id !== post.claimantId) invalid("not_claimant", "Only the rider who claimed this post can release it.", 403);
    if (post.status !== "reserved") invalid("post_unavailable", "This reservation is no longer active.", 409);
    if (post.kind === "offer") add(rider.id, post.rewardTokens, `release:${randomUUID()}`, `board:refund:${post.id}`);
    next.status = "open"; next.claimantId = null; next.claimantName = null;
  }
  return { post: next, transfers };
}
function applyMemory(transfers: Transfer[]) {
  const state = memoryGame();
  for (const t of transfers) state.tokens.push({ ...t, createdAt: new Date().toISOString() });
}
async function applyDb(sql: TransactionSql, transfers: Transfer[]) {
  for (const t of transfers) await sql`insert into token_ledger (rider_id,delta,reason,ref) values (${t.riderId},${t.delta},${t.reason},${t.ref})`;
}
function createPost(input: CreateBountyRequest, rider: Identity): StoredPost {
  return { id: `bty_${randomUUID().replaceAll("-", "")}`, requestId: input.requestId, authorId: rider.id, authorName: rider.displayName, teamRouteId: rider.team, kind: input.kind, title: input.title, body: input.body, rewardTokens: input.rewardTokens, have: input.have, want: input.want, station: input.station, status: "open", claimantId: null, claimantName: null, createdAt: new Date().toISOString() };
}
function rowPost(row: Record<string, unknown>): StoredPost {
  return { id: String(row.id), requestId: String(row.request_id), authorId: String(row.author_id), authorName: String(row.author_name), teamRouteId: row.team as PlayableTeamId, kind: row.kind as StoredPost["kind"], title: String(row.title), body: String(row.body), rewardTokens: Number(row.reward_tokens), have: row.have == null ? undefined : String(row.have), want: row.want == null ? undefined : String(row.want), station: row.station == null ? undefined : String(row.station), status: row.status as StoredPost["status"], claimantId: row.claimant_id == null ? null : String(row.claimant_id), claimantName: row.claimant_name == null ? null : String(row.claimant_name), createdAt: new Date(row.created_at as string).toISOString() };
}
async function postDb(sql: TransactionSql, id: string): Promise<StoredPost | undefined> {
  const [row] = await sql`select p.*,a.display_name as author_name,a.home_team_route_id as team,c.display_name as claimant_name from bounty_posts p join riders a on a.id=p.author_id left join riders c on c.id=p.claimant_id where p.id=${id}`;
  return row ? rowPost(row) : undefined;
}
// Starter posts so the board has life on a fresh server (memory mode). Authors are community riders.
const SEED_POSTS: Omit<StoredPost, "id" | "createdAt" | "requestId">[] = [
  { authorId: "rdr_seed_maya", authorName: "Maya", teamRouteId: "Orange", kind: "bounty", title: "Grab me an iced coffee at Back Bay?", body: "Running late from a lecture. Meet at the Dartmouth St exit, I'll pay you back + tokens.", rewardTokens: 3, station: "Back Bay", status: "open", claimantId: null, claimantName: null },
  { authorId: "rdr_seed_jordan", authorName: "Jordan", teamRouteId: "Red", kind: "trade", title: "Trading a coffee perk for a snack perk", body: "Got a spare coffee reward, would rather have the snack one.", rewardTokens: 0, have: "Coffee reward", want: "Snack reward", station: "Kendall/MIT", status: "open", claimantId: null, claimantName: null },
  { authorId: "rdr_seed_priya", authorName: "Priya", teamRouteId: "Blue", kind: "offer", title: "Free harbor walk tips", body: "Riding Blue to Aquarium most mornings. Happy to show newcomers the best waterfront spots.", rewardTokens: 0, station: "Aquarium", status: "open", claimantId: null, claimantName: null },
  { authorId: "rdr_seed_leo", authorName: "Leo", teamRouteId: "Green", kind: "bounty", title: "Need someone to snap the Kenmore sign for a hunt", body: "Delay on the B branch, I'm stuck at BU. Photo of the Kenmore sign please!", rewardTokens: 2, station: "Kenmore", status: "open", claimantId: null, claimantName: null },
  { authorId: "rdr_seed_ana", authorName: "Ana", teamRouteId: "Green", kind: "offer", title: "Study buddy on the E line", body: "Riding Northeastern to Park St around 5pm. Down to quiz each other on the ride.", rewardTokens: 0, station: "Northeastern University", status: "open", claimantId: null, claimantName: null },
  { authorId: "rdr_seed_sam", authorName: "Sam", teamRouteId: "Orange", kind: "trade", title: "Swap sticker for museum reward", body: "Collecting stickers for the team wall. Have a museum reward to trade.", rewardTokens: 0, have: "Museum reward", want: "City builder sticker", station: "Downtown Crossing", status: "open", claimantId: null, claimantName: null },
  { authorId: "rdr_seed_kai", authorName: "Kai", teamRouteId: "Red", kind: "bounty", title: "Help Red win the week", body: "First 3 people who ride Red past Harvard tonight get tokens from me. Let's climb the board!", rewardTokens: 5, station: "Harvard", status: "reserved", claimantId: "rdr_seed_jordan", claimantName: "Jordan" },
];
function seedMemoryBoard() {
  const posts = postsMemory();
  if (posts.size || shared.__tcityBountiesSeeded) return;
  shared.__tcityBountiesSeeded = true;
  const now = Date.now();
  SEED_POSTS.forEach((p, i) => {
    const id = `bty_seed_${i}`;
    posts.set(id, { ...p, id, requestId: id, createdAt: new Date(now - (i * 23 + 7) * 60_000).toISOString() });
  });
}
export async function listBounties(): Promise<BountiesResponse> {
  if (!hasDb()) seedMemoryBoard();
  if (!hasDb()) return { posts: [...postsMemory().values()].filter(p => p.status !== "cancelled").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100).map(publicPost) };
  const rows = await getSql()`select p.*,a.display_name as author_name,a.home_team_route_id as team,c.display_name as claimant_name from bounty_posts p join riders a on a.id=p.author_id left join riders c on c.id=p.claimant_id where p.status!='cancelled' order by p.created_at desc limit 100`;
  return { posts: rows.map(row => publicPost(rowPost(row))) };
}
export async function createBounty(raw: CreateBountyRequest): Promise<BountyMutationResponse> {
  const input = validateCreate(raw);
  if (!hasDb()) {
    const rider = identityMemory(input.riderId);
    const previous = [...postsMemory().values()].find(p => p.authorId === rider.id && p.requestId === input.requestId);
    if (previous) return { post: publicPost(previous), tokensLeft: balanceMemory(rider.id) };
    const balance = balanceMemory(rider.id);
    const cost = input.kind === "offer" ? 0 : input.rewardTokens;
    debitAvailable(balance, cost);
    const post = createPost(input, rider);
    if (cost) applyMemory([{ riderId: rider.id, delta: -cost, ref: `board:${post.id}:create`, reason: `board:hold:${post.id}` }]);
    postsMemory().set(post.id, post);
    return { post: publicPost(post), tokensLeft: balance - cost };
  }
  return await getSql().begin(async sql => {
    await sql`select pg_advisory_xact_lock(${GAME_LOCK})`;
    const rider = await identityDb(sql, input.riderId);
    const [previous] = await sql`select id from bounty_posts where author_id=${rider.id} and request_id=${input.requestId}`;
    if (previous) return { post: publicPost((await postDb(sql, previous.id))!), tokensLeft: await balanceDb(sql, rider.id) };
    const balance = await balanceDb(sql, rider.id);
    const cost = input.kind === "offer" ? 0 : input.rewardTokens;
    debitAvailable(balance, cost);
    const post = createPost(input, rider);
    await sql`insert into bounty_posts (id,author_id,request_id,kind,title,body,reward_tokens,have,want,station,status,created_at) values (${post.id},${post.authorId},${post.requestId},${post.kind},${post.title},${post.body},${post.rewardTokens},${post.have ?? null},${post.want ?? null},${post.station ?? null},${post.status},${post.createdAt})`;
    if (cost) await applyDb(sql, [{ riderId: rider.id, delta: -cost, ref: `board:${post.id}:create`, reason: `board:hold:${post.id}` }]);
    return { post: publicPost(post), tokensLeft: balance - cost };
  });
}
export async function actOnBounty(id: string, actorId: string, action: BountyAction): Promise<BountyMutationResponse> {
  riderId(actorId);
  if (typeof id !== "string" || !id || id.length > 200 || !["claim", "release", "complete", "cancel"].includes(action)) invalid("invalid_action", "Choose a valid post action.");
  if (!hasDb()) {
    const rider = identityMemory(actorId);
    const post = postsMemory().get(id);
    if (!post) invalid("post_not_found", "This post could not be found.", 404);
    const changed = move(post, rider, action, balanceMemory(actorId));
    applyMemory(changed.transfers); postsMemory().set(id, changed.post);
    return { post: publicPost(changed.post), tokensLeft: balanceMemory(actorId) };
  }
  return await getSql().begin(async sql => {
    await sql`select pg_advisory_xact_lock(${GAME_LOCK})`;
    const rider = await identityDb(sql, actorId);
    const post = await postDb(sql, id);
    if (!post) invalid("post_not_found", "This post could not be found.", 404);
    const changed = move(post, rider, action, await balanceDb(sql, actorId));
    await applyDb(sql, changed.transfers);
    await sql`update bounty_posts set status=${changed.post.status},claimant_id=${changed.post.claimantId},updated_at=now() where id=${id}`;
    return { post: publicPost(changed.post), tokensLeft: await balanceDb(sql, actorId) };
  });
}
