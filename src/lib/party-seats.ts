import type { Party } from "@/data/parties";

type PartySeatSnapshot = Pick<Party, "wins" | "leads" | "totalSeats" | "samanupatik">;

export function getPartyTotalSeats(party: PartySeatSnapshot): number {
  return Math.max(party.totalSeats, party.wins + party.leads);
}

export function getPartyPRSeats(party: PartySeatSnapshot): number {
  if (party.samanupatik > 0) return party.samanupatik;
  return Math.max(party.totalSeats - (party.wins + party.leads), 0);
}
