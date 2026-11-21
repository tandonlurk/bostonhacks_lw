// One realistic fixture per response in docs/CONTRACTS.md.
// Used by route stubs and by the UI in mock mode (NEXT_PUBLIC_USE_MOCKS=1).
import type {
  ChallengeSubmitResponse,
  ChallengesResponse,
  ClaimLandmarkResponse,
  HotspotsResponse,
  MeetResponse,
  SideQuest,
  NearbyStationResponse,
  StartRideResponse,
  CompleteHuntResponse,
  CreateRiderResponse,
  DelayHeatmapResponse,
  DelayResponse,
  DemoSimResponse,
  DistrictsResponse,
  EndRideResponse,
  HealthResponse,
  HuntResponse,
  LandmarksResponse,
  LeaderboardResponse,
  Lot,
  LotTier,
  PerksResponse,
  PhotoCheckResponse,
  RedeemPerkResponse,
  RideSampleResponse,
  Rider,
  RoutesResponse,
  StopsResponse,
  TeamRouteId,
  TokensResponse,
  VehiclesResponse,
} from "./index";
import { MBTA_ROUTES, TEAMS, TEAM_ROUTE_IDS } from "./routes";

const NOW = "2026-11-21T19:00:00.000Z";

export const healthFixture: HealthResponse = { ok: true, time: NOW };

export const routesFixture: RoutesResponse = MBTA_ROUTES.map((r) => ({
  id: r.id,
  teamRouteId: r.teamRouteId,
  name: r.name,
  color: TEAMS[r.teamRouteId].color,
  districtName: TEAMS[r.teamRouteId].districtName,
}));

export const stopsFixture: StopsResponse = [
  { id: "place-bland", name: "Blandford Street", lat: 42.349293, lng: -71.100258 },
  { id: "place-bucen", name: "Boston University Central", lat: 42.350082, lng: -71.106865 },
  { id: "place-kencl", name: "Kenmore", lat: 42.348949, lng: -71.095169 },
  { id: "place-hymnl", name: "Hynes Convention Center", lat: 42.347888, lng: -71.087903 },
  { id: "place-coecl", name: "Copley", lat: 42.349974, lng: -71.077447 },
  { id: "place-pktrm", name: "Park Street", lat: 42.356395, lng: -71.062424 },
];

export const vehiclesFixture: VehiclesResponse = {
  updatedAt: NOW,
  vehicles: [
    { id: "G-10224", routeId: "Green-B", teamRouteId: "Green", directionId: 1, lat: 42.34985, lng: -71.1035, bearing: 80, speed: 6.2, currentStatus: "IN_TRANSIT_TO", stopId: "70149", stopSequence: 590, label: "3667-3851" },
    { id: "G-10095", routeId: "Green-B", teamRouteId: "Green", directionId: 0, lat: 42.35018, lng: -71.1082, bearing: 260, speed: null, currentStatus: "STOPPED_AT", stopId: "170141", stopSequence: 560, label: "3902-3712" },
    { id: "R-547A1E2B", routeId: "Red", teamRouteId: "Red", directionId: 1, lat: 42.36249, lng: -71.08618, bearing: 120, speed: 11.4, currentStatus: "IN_TRANSIT_TO", stopId: "70072", stopSequence: 90, label: "1812" },
    { id: "O-548A2B11", routeId: "Orange", teamRouteId: "Orange", directionId: 0, lat: 42.34735, lng: -71.07505, bearing: 200, speed: 8.0, currentStatus: "INCOMING_AT", stopId: "70014", stopSequence: 100, label: "1442" },
    { id: "B-547A3C09", routeId: "Blue", teamRouteId: "Blue", directionId: 0, lat: 42.37426, lng: -71.0304, bearing: 30, speed: 13.1, currentStatus: "IN_TRANSIT_TO", stopId: "70047", stopSequence: 60, label: "0718" },
    { id: "y1307", routeId: "742", teamRouteId: "Silver", directionId: 0, lat: 42.35226, lng: -71.04682, bearing: 95, speed: 5.5, currentStatus: "IN_TRANSIT_TO", stopId: "247", stopSequence: 3, label: "1307" },
  ],
};

export const delayFixture: DelayResponse = {
  active: true,
  source: "simulated",
  teamRouteIds: ["Green"],
  message: "Green Line B branch: delays of about 15 minutes due to a disabled train.",
  startedAt: "2026-11-21T18:52:00.000Z",
};

export const noDelayFixture: DelayResponse = {
  active: false,
  source: "none",
  teamRouteIds: [],
  message: null,
  startedAt: null,
};

export const createRiderFixture: CreateRiderResponse = { riderId: "rdr_demo_alex" };

export const riderFixture: Rider = {
  riderId: "rdr_demo_alex",
  displayName: "Alex",
  homeTeamRouteId: "Green",
  points: 142,
  tokens: 14,
  streakDays: 3,
};

export const rideSampleSearchingFixture: RideSampleResponse = {
  state: "searching",
  sessionId: "ses_demo_1",
  stopsCredited: 0,
  message: "Looking for your train... (1/3 matches)",
};

export const rideSampleFixture: RideSampleResponse = {
  state: "on_vehicle",
  sessionId: "ses_demo_1",
  vehicleId: "G-10224",
  teamRouteId: "Green",
  stopsCredited: 2,
  nextStopId: "place-kencl",
  message: "On Green Line toward Government Center. 6 min, 6 pts.",
};

export const rideSampleCrewFixture: RideSampleResponse = {
  state: "on_vehicle",
  sessionId: "ses_demo_1",
  vehicleId: "G-10224",
  teamRouteId: "Green",
  stopsCredited: 3,
  nextStopId: "place-hymnl",
  message: "On Green Line. 8 min, 12 pts.",
  minutesRidden: 8,
  pointsAwarded: 12,
  originStationId: "place-bucen",
  crew: {
    teammates: [{ riderId: "rdr_demo_sam", displayName: "Sam" }],
    multiplier: 2.4,
    endsAt: "2026-11-21T19:10:00.000Z",
    bonusPoints: 4,
    message: "Sam is on your train! 2.4x points, fading fast.",
  },
};

export const nearbyStationFixture: NearbyStationResponse = {
  canStart: true,
  radiusM: 330,
  station: { id: "place-bucen", name: "Boston University Central", lat: 42.350082, lng: -71.106865, distanceM: 84 },
  message: "You're at Boston University Central. Ready to ride.",
};

export const startRideFixture: StartRideResponse = {
  sessionId: "ses_demo_1",
  state: "searching",
  station: { id: "place-bucen", name: "Boston University Central", lat: 42.350082, lng: -71.106865, distanceM: 84 },
  radiusM: 330,
  message: "Ride started at Boston University Central. Board any train; we'll pick it up automatically.",
};

export const rideSampleTunnelFixture: RideSampleResponse = {
  state: "in_tunnel",
  sessionId: "ses_demo_1",
  vehicleId: "G-10224",
  teamRouteId: "Green",
  stopsCredited: 3,
  nextStopId: "place-hymnl",
  message: "Underground. Still tracking your train.",
};

export const endRideFixture: EndRideResponse = {
  sessionId: "ses_demo_1",
  stopsCredited: 5,
  pointsAwarded: 10,
};

const TIER_THRESHOLDS = [20, 60, 140, 300, 600];
const KINDS = ["tower", "lab", "house", "park", "shop", "dock"];
function lotsFor(team: TeamRouteId, seed: number): Lot[] {
  return Array.from({ length: 12 }, (_, i) => {
    const points = ((seed * 37 + i * 53) % 650) * (i < 6 ? 1 : 0.3);
    const tier = TIER_THRESHOLDS.filter((t) => points >= t).length as LotTier;
    return {
      id: `${team}-${i}`,
      tier,
      points: Math.round(points),
      x: i % 4,
      y: Math.floor(i / 4),
      kind: KINDS[(seed + i) % KINDS.length],
    };
  });
}

export const districtsFixture: DistrictsResponse = TEAM_ROUTE_IDS.map((team, idx) => {
  const lots = lotsFor(team, idx + 1);
  return {
    teamRouteId: team,
    name: TEAMS[team].districtName,
    totalPoints: lots.reduce((s, l) => s + l.points, 0),
    lots,
  };
});

export const leaderboardFixture: LeaderboardResponse = {
  updatedAt: NOW,
  teams: [...districtsFixture]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((d, i) => ({ teamRouteId: d.teamRouteId, points: d.totalPoints, rank: i + 1, riders: 4 + ((i * 3) % 7) })),
};

export const huntFixture: HuntResponse = {
  huntId: "hunt-place-bucen",
  stopId: "place-bucen",
  clues: [
    { id: "bucen-1", text: "Find the station name sign and count the letters in the first word.", verified: false },
    { id: "bucen-2", text: "Spot the nearest bus stop sign outside the platform. Which route number is listed first?", verified: false },
  ],
};

export const completeHuntFixture: CompleteHuntResponse = { pointsAwarded: 10, tokensAwarded: 1, alreadyDone: false };

export const landmarksFixture: LandmarksResponse = [
  { id: "fenway-park", name: "Fenway Park", lat: 42.346676, lng: -71.097218, stopId: "place-kencl", bonusPoints: 15, claimed: false },
  { id: "public-garden", name: "Public Garden", lat: 42.354029, lng: -71.069591, stopId: "place-armnl", bonusPoints: 15, claimed: true },
];

export const claimLandmarkFixture: ClaimLandmarkResponse = { pointsAwarded: 15, alreadyClaimed: false };

export const perksFixture: PerksResponse = [
  { id: "perk-coffee", title: "Free small coffee", partner: "Platform Coffee", costTokens: 10, remaining: 7, rotatesAt: "2026-11-21T21:00:00.000Z" },
  { id: "perk-museum", title: "$5 off museum entry", partner: "Harbor Discovery Club", costTokens: 25, remaining: 3, rotatesAt: "2026-11-21T21:00:00.000Z" },
];

export const redeemPerkFixture: RedeemPerkResponse = { redemptionCode: "TCITY-7F3K-92QD", tokensLeft: 4 };

export const tokensFixture: TokensResponse = {
  balance: 14,
  ledger: [
    { delta: 1, reason: "hunt:bucen-1", createdAt: "2026-11-21T18:55:00.000Z" },
    { delta: 10, reason: "points:ride", createdAt: "2026-11-21T18:30:00.000Z" },
    { delta: 3, reason: "points:ride", createdAt: "2026-11-20T14:10:00.000Z" },
  ],
};

export const demoSimFixture: DemoSimResponse = { running: true, riders: 24 };

export const heatmapFixture: DelayHeatmapResponse = {
  available: true,
  updatedAt: NOW,
  windowMinutes: 120,
  stations: [
    { stopId: "place-kencl", name: "Kenmore", lat: 42.348949, lng: -71.095169, teamRouteId: "Green", observations: 64, slowShare: 0.41, avgSpeedMps: 3.2 },
    { stopId: "place-bucen", name: "Boston University Central", lat: 42.350082, lng: -71.106865, teamRouteId: "Green", observations: 38, slowShare: 0.18, avgSpeedMps: 5.9 },
    { stopId: "place-pktrm", name: "Park Street", lat: 42.356395, lng: -71.062424, teamRouteId: "Red", observations: 52, slowShare: 0.33, avgSpeedMps: 4.1 },
    { stopId: "place-dwnxg", name: "Downtown Crossing", lat: 42.355518, lng: -71.060225, teamRouteId: "Orange", observations: 47, slowShare: 0.12, avgSpeedMps: 7.4 },
    { stopId: "place-aport", name: "Airport", lat: 42.374262, lng: -71.030395, teamRouteId: "Blue", observations: 30, slowShare: 0.07, avgSpeedMps: 9.8 },
    { stopId: "place-wtcst", name: "World Trade Center", lat: 42.34863, lng: -71.04246, teamRouteId: "Silver", observations: 21, slowShare: 0.29, avgSpeedMps: 4.6 },
  ],
};

export const photoCheckFixture: PhotoCheckResponse = {
  enabled: true,
  passed: true,
  confidence: 0.86,
  reason: "Looks like the station sign. Nice find!",
};

export const photoCheckDisabledFixture: PhotoCheckResponse = {
  enabled: false,
  passed: null,
  confidence: null,
  reason: "Photo check is off. Tap to confirm instead.",
};

export const hotspotsFixture: HotspotsResponse = {
  riderId: "rdr_demo_alex",
  tripsLogged: 4,
  tripsNeeded: 3,
  eligible: true,
  hotspots: [
    {
      id: "hs_demo_1",
      stationId: "place-bbsta",
      name: "Back Bay",
      lat: 42.34735,
      lng: -71.075727,
      fromStationId: "place-bucen",
      toStationId: "place-dwnxg",
      path: ["place-bucen", "place-kencl", "place-hymnl", "place-coecl", "place-armnl", "place-boyls", "place-pktrm", "place-dwnxg"],
      viaRouteIds: ["Green", "Orange"],
      reason: "Switch to the Orange Line at Back Bay instead of riding Green all the way to Park Street.",
      sharedInterests: ["coffee", "music"],
      sharedWith: 3,
      multiplier: 5,
      meetPoints: 50,
      createdAt: NOW,
      expiresAt: "2026-11-22T19:00:00.000Z",
    },
  ],
};

export const meetWaitingFixture: MeetResponse = {
  status: "waiting",
  code: "4821",
  expiresAt: "2026-11-21T19:00:30.000Z",
  multiplier: 5,
  pointsAwarded: 0,
  message: "Bump phones now, or have them enter 4821.",
};

export const meetMatchedFixture: MeetResponse = {
  status: "matched",
  code: "4821",
  expiresAt: "2026-11-21T19:00:30.000Z",
  partner: { riderId: "rdr_demo_jo", displayName: "Jo", homeTeamRouteId: "Orange" },
  multiplier: 5,
  pointsAwarded: 50,
  message: "You met Jo (Orange) at Back Bay! 5x: +50 points.",
};

function silverQuestFixture(): SideQuest {
  return {
    id: "silver-line",
    title: "Silver Line side quest",
    prompt: "Work the Silver Line into a trip: ride it for 3+ minutes. Points go to your own team.",
    points: 25,
    done: false,
    pointsAwarded: 0,
    progressMinutes: 0,
    targetMinutes: 3,
  };
}

export const challengesFixture: ChallengesResponse = {
  active: true,
  delay: {
    active: true,
    source: "simulated",
    teamRouteIds: ["Green"],
    message: "Green Line delays of about 15 minutes.",
    startedAt: "2026-11-21T18:52:00.000Z",
  },
  roundId: "delay-2026-11-21T18:52",
  challenges: [
    { id: "ch_map", prompt: "Find and photograph a transit map.", points: 15, done: true, pointsAwarded: 12 },
    { id: "ch_color", prompt: "Snap something the color of your team's line.", points: 10, done: false, pointsAwarded: 0 },
    { id: "ch_art", prompt: "Photograph a mural, sculpture or other public art.", points: 20, done: false, pointsAwarded: 0 },
  ],
  sideQuests: [silverQuestFixture()],
};

export const challengeSubmitFixture: ChallengeSubmitResponse = {
  enabled: true,
  passed: true,
  score: 0.82,
  reason: "That's a transit map, nice find!",
  pointsAwarded: 12,
  alreadyDone: false,
};
