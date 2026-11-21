import seeds from "../../../data/landmarks.json";
import type { ClaimLandmarkResponse, Landmark, TeamRouteId } from "@/contracts";
import { awardCompletion, pointEvents } from "@/server/points";
import { ScoringError } from "@/server/points/rules";

export function validCoordinates(lat: unknown, lng: unknown): lat is number {
  return typeof lat === "number" && Number.isFinite(lat) && Math.abs(lat) <= 90 &&
    typeof lng === "number" && Number.isFinite(lng) && Math.abs(lng) <= 180;
}
export function distanceM(lat: number, lng: number, toLat: number, toLng: number): number {
  const rad = (n: number) => n * Math.PI / 180;
  const h = Math.sin(rad(toLat-lat)/2)**2 + Math.cos(rad(lat))*Math.cos(rad(toLat))*Math.sin(rad(toLng-lng)/2)**2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export async function landmarksNear(options: { lat?: number; lng?: number; radiusM?: number; riderId?: string } = {}): Promise<Landmark[]> {
  const { lat,lng,riderId } = options;
  const radiusM = options.radiusM ?? 800;
  if ((lat !== undefined || lng !== undefined) && !validCoordinates(lat,lng)) throw new ScoringError("invalid_location", "Provide finite lat and lng coordinates.");
  if (!Number.isFinite(radiusM) || radiusM <= 0 || radiusM > 10000) throw new ScoringError("invalid_radius", "radiusM must be between 1 and 10000 meters.");
  const claimed = new Set(riderId ? (await pointEvents()).filter(e => e.riderId === riderId && e.type === "landmark").map(e => e.ref) : []);
  return seeds.filter(l => lat === undefined || lng === undefined || distanceM(lat,lng,l.lat,l.lng) <= radiusM)
    .map(({id,name,lat,lng,stopId,bonusPoints}) => ({id,name,lat,lng,stopId,bonusPoints,claimed:claimed.has(`landmark:${riderId}:${id}`)}));
}
export async function claimLandmark(riderId: string, landmarkId: string, lat: number, lng: number): Promise<ClaimLandmarkResponse> {
  if (typeof riderId !== "string" || !riderId.trim() || typeof landmarkId !== "string") throw new ScoringError("invalid_claim", "riderId and landmarkId are required.");
  if (!validCoordinates(lat,lng)) throw new ScoringError("invalid_location", "Provide finite lat and lng coordinates.");
  const landmark = seeds.find(l => l.id === landmarkId);
  if (!landmark) throw new ScoringError("landmark_not_found", "Unknown landmark.", 404);
  if (distanceM(lat,lng,landmark.lat,landmark.lng) > landmark.claimRadiusM) throw new ScoringError("outside_geofence", `Move within ${landmark.claimRadiusM} meters of this landmark to claim it.`, 403);
  const result = await awardCompletion({riderId,teamRouteId:landmark.teamRouteId as TeamRouteId,type:"landmark",amount:landmark.bonusPoints ?? 15,
    ref:`landmark:${riderId}:${landmarkId}`},"landmark",landmarkId);
  return {pointsAwarded:result.pointsAwarded,alreadyClaimed:result.pointsAwarded===0};
}
