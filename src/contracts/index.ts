// API and data shapes. Source of truth: docs/CONTRACTS.md.
// Change only via a `type:contract` issue (AGENTS.md section 5).
// All times are ISO 8601 UTC strings.

export * from "./routes";

import type { TeamRouteId } from "./routes";

// ---------- Errors ----------
export interface ApiError {
  error: { code: string; message: string };
}

// ---------- Section 2: read endpoints (A) ----------
export interface HealthResponse {
  ok: true;
  time: string;
  /** Additive: database status. */
  db?: "ok" | "unconfigured" | "error";
}

/** GET /api/routes: one row per MBTA route id (Green-B, 741, ...). */
export interface RouteInfo {
  id: string;
  teamRouteId: TeamRouteId;
  name: string;
  color: string;
  districtName: string;
}
export type RoutesResponse = RouteInfo[];

/** GET /api/stops?routeId=Red */
export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}
export type StopsResponse = Stop[];

export type VehicleStatus = "INCOMING_AT" | "STOPPED_AT" | "IN_TRANSIT_TO";

export interface Vehicle {
  id: string;
  /** MBTA route id, e.g. "Green-B" or "742". */
  routeId: string;
  teamRouteId: TeamRouteId;
  directionId: 0 | 1;
  lat: number;
  lng: number;
  bearing: number | null;
  /** Meters per second, when MBTA reports it. */
  speed: number | null;
  currentStatus: VehicleStatus;
  stopId: string | null;
  stopSequence: number | null;
  label: string;
}

/** GET /api/vehicles?teams=Red,Green */
export interface VehiclesResponse {
  updatedAt: string;
  vehicles: Vehicle[];
}

export type DelaySource = "alert" | "simulated" | "none";

/** GET /api/delay?teamRouteId=Red, and POST /api/delay/simulate */
export interface DelayResponse {
  active: boolean;
  source: DelaySource;
  teamRouteIds: TeamRouteId[];
  message: string | null;
  startedAt: string | null;
}

/** GET /api/delay/heatmap?minutes=120 (T18). slowShare 0-1: trains crawling (< 1.5 m/s) toward the station. */
export interface HeatmapStation {
  stopId: string;
  name: string;
  lat: number;
  lng: number;
  teamRouteId: TeamRouteId;
  observations: number;
  slowShare: number;
  avgSpeedMps: number | null;
}
export interface DelayHeatmapResponse {
  /** false when there is no history store (no DB); stations is then empty */
  available: boolean;
  updatedAt: string;
  windowMinutes: number;
  stations: HeatmapStation[];
}

export interface SimulateDelayRequest {
  teamRouteId: TeamRouteId;
  active: boolean;
}

// ---------- Section 3: riders and rides (A) ----------
export interface CreateRiderRequest {
  displayName: string;
  homeTeamRouteId: TeamRouteId;
}
export interface CreateRiderResponse {
  riderId: string;
}

/** GET /api/riders/:id */
export interface Rider {
  riderId: string;
  displayName: string;
  homeTeamRouteId: TeamRouteId;
  points: number;
  tokens: number;
  streakDays: number;
}

export type RideState = "searching" | "on_vehicle" | "in_tunnel" | "left";

export interface ManualRideHint {
  routeId: string;
  directionId: 0 | 1;
  stopId: string;
}

/** POST /api/rides/sample */
export interface RideSampleRequest {
  riderId: string;
  lat: number;
  lng: number;
  /** GPS accuracy radius in meters. */
  accuracy: number;
  /** Meters per second, null if the device doesn't report it. */
  speed: number | null;
  /** Client timestamp, ISO 8601. */
  ts: string;
  manual?: ManualRideHint;
}

export interface RideSampleResponse {
  state: RideState;
  sessionId: string;
  vehicleId?: string;
  teamRouteId?: TeamRouteId;
  stopsCredited: number;
  nextStopId?: string;
  message: string;
}

/** POST /api/rides/end */
export interface EndRideRequest {
  riderId: string;
}
export interface EndRideResponse {
  sessionId: string;
  stopsCredited: number;
  pointsAwarded: number;
}

// ---------- Section 4: game endpoints (B) ----------
export interface LeaderboardTeam {
  teamRouteId: TeamRouteId;
  points: number;
  rank: number;
  riders: number;
}
export interface LeaderboardResponse {
  updatedAt: string;
  teams: LeaderboardTeam[];
}

export type LotTier = 0 | 1 | 2 | 3 | 4 | 5;
export interface Lot {
  id: string;
  tier: LotTier;
  points: number;
  x: number;
  y: number;
  kind: string;
}
export interface District {
  teamRouteId: TeamRouteId;
  name: string;
  totalPoints: number;
  lots: Lot[];
}
export type DistrictsResponse = District[];

export interface HuntClue {
  id: string;
  text: string;
  verified: boolean;
}
export interface HuntResponse {
  huntId: string;
  stopId: string;
  clues: HuntClue[];
}
export interface CompleteHuntRequest {
  riderId: string;
  clueId: string;
}
export interface CompleteHuntResponse {
  pointsAwarded: number;
  tokensAwarded: number;
  alreadyDone: boolean;
}

/** POST /api/photo-check (T17, optional Gemini check). Does not award points. */
export interface PhotoCheckRequest {
  clueId: string;
  clueText: string;
  /** base64 image bytes without a data: prefix, at most 3 MB decoded */
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}
export interface PhotoCheckResponse {
  /** false: no key or Gemini unavailable, so the UI falls back to tap-to-confirm */
  enabled: boolean;
  passed: boolean | null;
  confidence: number | null;
  reason: string;
}

export interface Landmark {
  id: string;
  name: string;
  lat: number;
  lng: number;
  stopId: string;
  bonusPoints: number;
  claimed: boolean;
}
export type LandmarksResponse = Landmark[];
export interface ClaimLandmarkRequest {
  riderId: string;
  landmarkId: string;
  lat: number;
  lng: number;
}
export interface ClaimLandmarkResponse {
  pointsAwarded: number;
  alreadyClaimed: boolean;
}

export interface Perk {
  id: string;
  title: string;
  partner: string;
  costTokens: number;
  remaining: number;
  rotatesAt: string;
}
export type PerksResponse = Perk[];
export interface RedeemPerkRequest {
  riderId: string;
  perkId: string;
}
export interface RedeemPerkResponse {
  redemptionCode: string;
  tokensLeft: number;
}

export interface TokenLedgerEntry {
  delta: number;
  reason: string;
  createdAt: string;
  txSignature?: string;
}
export interface TokensResponse {
  balance: number;
  ledger: TokenLedgerEntry[];
}

export type DemoSimAction = "start" | "stop" | "reset";
export interface DemoSimRequest {
  action: DemoSimAction;
}
export interface DemoSimResponse {
  running: boolean;
  riders: number;
}

// ---------- Section 6: internal scoring call (B exports, A calls) ----------
export type PointEventType =
  | "ride_stop"
  | "first_ride"
  | "streak"
  | "hunt"
  | "landmark";

export interface AwardPointsInput {
  riderId: string;
  teamRouteId: TeamRouteId;
  type: PointEventType;
  amount: number;
  /** Idempotency key: awarding the same ref twice is a no-op. */
  ref: string;
}
export interface AwardPointsResult {
  pointsAwarded: number;
  tokensAwarded: number;
}
export type AwardPoints = (input: AwardPointsInput) => Promise<AwardPointsResult>;
