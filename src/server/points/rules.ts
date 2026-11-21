import { isTeamRouteId } from "@/contracts";
import type { AwardPointsInput, AwardPointsResult, PointEventType } from "@/contracts";
import type { PointEvent } from "./state";

export const RIDE_HOURLY_CAP = 60;
export const LOT_THRESHOLDS = [20, 60, 140, 300, 600] as const;
const TYPES: PointEventType[] = ["ride_stop", "first_ride", "streak", "hunt", "landmark", "co_ride", "hotspot_meet", "challenge"];
const RIDE_TYPES: PointEventType[] = ["ride_stop", "first_ride", "streak"];
export class ScoringError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}
export function validateAward(input: AwardPointsInput): void {
  if (!input || typeof input.riderId !== "string" || !input.riderId.trim() || input.riderId.length > 200 ||
      !isTeamRouteId(input.teamRouteId) || !TYPES.includes(input.type) ||
      typeof input.ref !== "string" || !input.ref.trim() || input.ref.length > 500 ||
      !Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 10000) {
    throw new ScoringError("invalid_award", "Provide a rider, team, event type, positive integer amount and ref.");
  }
}
export function utcDay(ts: string): string { return new Date(ts).toISOString().slice(0, 10); }
export function streakDays(events: PointEvent[], at: Date): number {
  const days = new Set(events.filter(e => e.type === "ride_stop" && e.amount > 0).map(e => utcDay(e.createdAt)));
  let cursor = Date.parse(utcDay(at.toISOString()) + "T00:00:00.000Z");
  if (!days.has(utcDay(new Date(cursor).toISOString()))) cursor -= 86400000;
  let streak = 0;
  while (days.has(utcDay(new Date(cursor).toISOString()))) { streak++; cursor -= 86400000; }
  return streak;
}
export function planAward(input: AwardPointsInput, events: PointEvent[], at: Date): PointEvent[] {
  validateAward(input);
  if (events.some(e => e.ref === input.ref)) return [];
  const own = events.filter(e => e.riderId === input.riderId);
  const now = at.getTime();
  const spent = own.filter(e => RIDE_TYPES.includes(e.type) && Date.parse(e.createdAt) > now - 3600000 && Date.parse(e.createdAt) <= now)
    .reduce((sum, e) => sum + e.amount, 0);
  const isRide = RIDE_TYPES.includes(input.type);
  let budget = isRide ? Math.max(0, RIDE_HOURLY_CAP - spent) : Infinity;
  const result: PointEvent[] = [];
  const add = (type: PointEventType, amount: number, ref: string) => {
    const credited = Math.min(amount, budget);
    budget -= credited;
    result.push({ ...input, type, amount: credited, ref, createdAt: at.toISOString() });
  };
  // Zero-credit cap events retain the ref so a delayed retry cannot award it later.
  const day = utcDay(at.toISOString());
  const priorDaily = own.some(e => e.type === input.type && utcDay(e.createdAt) === day);
  const hasVerifiedRide = own.some(e => e.type === "ride_stop" && e.amount > 0 && utcDay(e.createdAt) === day);
  const amount = input.type === "hunt" ? 10 : input.type === "first_ride" || input.type === "streak"
    ? priorDaily || !hasVerifiedRide ? 0 : input.type === "first_ride" ? 5 : Math.min(streakDays(own, at) * 2, 10)
    : input.amount;
  add(input.type, amount, input.ref);
  if (input.type === "ride_stop" && result[0].amount > 0) {
    const day = utcDay(at.toISOString());
    const firstRef = `daily:first:${input.riderId}:${day}`;
    const streakRef = `daily:streak:${input.riderId}:${day}`;
    const rodeToday = own.some(e => e.type === "ride_stop" && e.amount > 0 && utcDay(e.createdAt) === day);
    if (!rodeToday) {
      if (!events.some(e => e.ref === firstRef)) add("first_ride", 5, firstRef);
      if (!events.some(e => e.ref === streakRef)) add("streak", Math.min(streakDays([...own, ...result], at) * 2, 10), streakRef);
    }
  }
  return result;
}
export function awardResult(events: PointEvent[], added: PointEvent[], riderId: string): AwardPointsResult {
  const before = events.filter(e => e.riderId === riderId).reduce((sum, e) => sum + e.amount, 0);
  const pointsAwarded = added.reduce((sum, e) => sum + e.amount, 0);
  return { pointsAwarded, tokensAwarded: Math.floor((before + pointsAwarded) / 10) - Math.floor(before / 10) };
}
