import seedrandom from "seedrandom";
import { distanceBetween, move } from "@ariel-mutebi/circle-discovery";
import type { Circle, Place, LatLng } from "@ariel-mutebi/circle-discovery";

// ─── World generation ────────────────────────────────────────────────────────

export function generateWorld(
  seed: number,
  center: LatLng,
  radius: number,
  n = 600,
): Place[] {
  const rng = seedrandom(String(seed));

  // Pick 8 cluster centres scattered across the full search area.
  const clusterCentres: LatLng[] = Array.from({ length: 8 }, () =>
    move(center, rng() * radius, rng() * 360),
  );

  const places: Place[] = [];
  let idx = 0;

  while (places.length < n) {
    const loc = rng() < 0.7
      /**
       * 70%: drop the place near a random cluster centre.
       * Spread of 0.12r keeps clusters tight enough that the algorithm
       * is forced to use small sub-circles in dense zones, making the
       * density-adaptive behaviour visible.
       */
      ? move(clusterCentres[Math.floor(rng() * 8)], rng() * radius * 0.12, rng() * 360)
      /**
       * 30%: scatter uniformly across the full disk.
       * Math.sqrt for a distribution uniform over area (Area of a circle
       * is directly proportional to radius squared). These sparse places
       * are what trigger the expansion factor correction in the algorithm.
       */
      : move(center, Math.sqrt(rng()) * radius * 0.98, rng() * 360);

    // Reject any point that landed outside the search circle.
    if (distanceBetween(center, loc) <= radius) {
      places.push({ id: `p${idx++}`, location: loc });
    }
  }

  return places;
}

// ─── Trace events ────────────────────────────────────────────────────────────

export interface TraceEvent {
  circle: Circle;
  results: Place[];
  callIndex: number;
}

/**
 * onTrace is async so the visualiser can await its own animation/delay
 * before the algorithm's next fetchPlaces call is allowed to proceed.
 */
export type TraceCallback = (event: TraceEvent) => Promise<void>;

// ─── Simulated Nearby Places API ─────────────────────────────────────────────

/**
 * Deterministic hash used to produce a stable ranking for a given
 * (place, circle) pair — mirrors the consistent ordering the real
 * Google Nearby Places API returns for a given query.
 */
function hashFloat(n: number): number {
  const x = Math.sin(n * 12989.8) * 43758.5453;
  return x - Math.floor(x);
}

function stableRank(place: Place, circle: Circle): number {
  const { latitude, longitude } = place.location!;
  return hashFloat(
    latitude * 31_337 +
    longitude * 97_531 +
    circle.center.latitude * 13_579 +
    circle.center.longitude * 24_681 +
    circle.radius,
  );
}

// ─── Instrumented fetchPlaces factory ────────────────────────────────────────

export function makeInstrumentedFetch(
  world: Place[],
  onTrace: TraceCallback,
): (circle: Circle) => Promise<Place[]> {
  let callIndex = 0;

  return async (circle: Circle): Promise<Place[]> => {
    /**
     * Simulate the API: filter to places inside the circle, apply a
     * stable ranking, then cap at 20 — the constraint the algorithm
     * is built around. Fewer than 20 results signals a sparse region.
     */
    const results = [...world]
      .filter(p => p.location && distanceBetween(p.location, circle.center) <= circle.radius)
      .sort((a, b) => stableRank(a, circle) - stableRank(b, circle))
      .slice(0, 20);

    /**
     * Fire the trace callback before returning results to the algorithm.
     * The algorithm is suspended here for as long as onTrace takes to
     * resolve — this is what gives the visualiser its animation budget.
     */
    await onTrace({ circle, results, callIndex });
    callIndex++;

    return results;
  };
}
