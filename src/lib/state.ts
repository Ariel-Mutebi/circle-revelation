import { writable, derived } from "svelte/store";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RunStatus = "idle" | "running" | "done";

export interface LogEntry {
  /** Sequential index of the fetchPlaces call that produced this entry. */
  callIndex: number;
  /** Radius of the query circle in kilometres, pre-formatted for display. */
  radiusKm: string;
  /** Number of places the simulated API returned for this call. */
  yielded: number;
  /** Number of those results that hadn't been seen in any previous call. */
  newIds: number;
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface State {
  status: RunStatus;
  callCount: number;
  foundCount: number;
  trueTotal: number | null;
  lastYield: number | null;
  log: LogEntry[];
  seed: number;
  speedIndex: number;
}

const INITIAL: State = {
  status: "idle",
  callCount: 0,
  foundCount: 0,
  trueTotal: null,
  lastYield: null,
  log: [],
  seed: 42,
  speedIndex: 2,
};

export const state = writable<State>({ ...INITIAL });

// ─── Derived values ───────────────────────────────────────────────────────────

/**
 * Coverage percentage, 0–100. Zero until trueTotal is known.
 * Sidebar and coverage bar both derive from this rather than
 * computing it independently.
 */
export const coverage = derived(state, $s =>
  $s.trueTotal ? Math.round($s.foundCount / $s.trueTotal * 100) : 0,
);

/**
 * Null while running (no assertion to show yet), then true/false once done.
 * Drives the pass/fail badge colour in the sidebar.
 */
export const assertionPassed = derived(state, $s =>
  $s.status === "done" ? ($s.trueTotal ? Math.round($s.foundCount / $s.trueTotal * 100) : 0) >= 80 : null,
);

// ─── Mutators ────────────────────────────────────────────────────────────────

/**
 * Called at the start of each run. Resets everything except seed and
 * speedIndex, which are user settings that survive across runs.
 */
export function resetState(seed: number, speedIndex: number) {
  state.set({ ...INITIAL, seed, speedIndex });
}

export function setTrueTotal(n: number) {
  state.update(s => ({ ...s, trueTotal: n }));
}

export function setStatus(status: RunStatus) {
  state.update(s => ({ ...s, status }));
}

/**
 * Called once per fetchPlaces call via the trace callback.
 * Appends a log entry and updates the running counters atomically
 * in a single state.update to avoid redundant renders.
 */
export function recordQuery(entry: LogEntry, foundCount: number) {
  state.update(s => ({
    ...s,
    callCount: s.callCount + 1,
    foundCount,
    lastYield: entry.yielded,
    log: [...s.log, entry],
  }));
}
