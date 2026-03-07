<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import seedrandom from "seedrandom";
  import { subCircleSearch, distanceBetween } from "@ariel-mutebi/circle-discovery";
  import { generateWorld, makeInstrumentedFetch } from "$lib/world.js";
  import {
    buildProjection,
    initSvg,
    drawInitialCircle,
    drawAllPlaces,
    updateDiscoveredPlaces,
    drawQueryCircle,
  } from "$lib/visual.js";
  import {
    state as appState,
    resetState,
    setTrueTotal,
    setStatus,
    recordQuery,
  } from "$lib/state.js";
  import Sidebar from "$lib/Sidebar.svelte";
  import Controls from "$lib/Controls.svelte";

  const SPEED_DELAYS = [80, 30, 10, 3, 0];

  let svgEl: SVGSVGElement;
  let wrapEl: HTMLDivElement;

  let abortController = new AbortController();
  let discoveredIds = new Set<string>();
  let flashVisible = $state(false);
  let flashPass = $state(false);
  let flashPct = $state(0);

  async function run() {
    abortController = new AbortController();
    const signal = abortController.signal;

    const { seed, speedIndex } = get(appState);
    resetState(seed, speedIndex);
    discoveredIds = new Set();
    flashVisible = false;

    const RADIUS = 20_000;

    /**
     * Use a different seed derivation than generateWorld (which seeds with
     * String(seed) directly) so the center doesn't land on the first cluster.
     */
    const rng = seedrandom(String(seed * 7 + 1));
    const center = {
      latitude: (rng() - 0.5) * 60,
      longitude: (rng() - 0.5) * 120,
    };

    const world = generateWorld(seed, center, RADIUS);

    const truePlaces = world.filter(
      p => p.location && distanceBetween(p.location, center) <= RADIUS,
    );
    const trueSet = new Set(truePlaces.map(p => p.id));
    setTrueTotal(truePlaces.length);

    const W = wrapEl.clientWidth;
    const H = wrapEl.clientHeight;
    const proj = buildProjection(center, RADIUS, W, H);
    initSvg(svgEl, W, H);
    drawInitialCircle(svgEl, center, RADIUS, proj);
    drawAllPlaces(svgEl, world, proj);

    setStatus("running");

    let callIndex = 0;

    const fetchPlaces = makeInstrumentedFetch(world, async ({ circle, results }) => {
      if (signal.aborted) return;

      drawQueryCircle(svgEl, circle, results.length, proj);

      const newIds = results
        .filter(p => p.id && !discoveredIds.has(p.id))
        .map(p => p.id);
      newIds.forEach(id => discoveredIds.add(id));
      updateDiscoveredPlaces(svgEl, discoveredIds);

      recordQuery(
        {
          callIndex: callIndex++,
          radiusKm: (circle.radius / 1000).toFixed(1),
          yielded: results.length,
          newIds: newIds.length,
        },
        discoveredIds.size,
      );

      const delay = SPEED_DELAYS[get(appState).speedIndex];
      await new Promise<void>(resolve =>
        delay > 0 ? setTimeout(resolve, delay) : requestAnimationFrame(() => resolve()),
      );
    });

    try {
      const found = await subCircleSearch({
        initialCenter: center,
        initialRadius: RADIUS,
        fetchPlaces,
      });

      if (signal.aborted) return;

      const confirmedFound = found.filter(p => trueSet.has(p.id)).length;
      const pct = Math.round(confirmedFound / truePlaces.length * 100);

      setStatus("done");
      flashPct = pct;
      flashPass = pct >= 80;
      flashVisible = true;
      setTimeout(() => { flashVisible = false; }, 4000);

    } catch (err) {
      if (!signal.aborted) {
        console.error("subCircleSearch error:", err);
        setStatus("idle");
      }
    }
  }

  function reset() {
    abortController.abort();
    discoveredIds = new Set();
    flashVisible = false;
    const { seed, speedIndex } = get(appState);
    resetState(seed, speedIndex);
    if (svgEl) initSvg(svgEl, wrapEl.clientWidth, wrapEl.clientHeight);
  }

  onMount(() => {
    initSvg(svgEl, wrapEl.clientWidth, wrapEl.clientHeight);
  });
</script>

<svelte:head>
  <title>Circle Revelation</title>
  <link rel="icon" href="/circle-revelation-logo.png" type="image/x-icon">
</svelte:head>

<div class="flex flex-col h-screen bg-zinc-950 text-zinc-300 font-mono overflow-hidden">

  <!-- ── Header ── -->
  <header class="flex items-baseline gap-4 px-5 py-2.5 border-b border-zinc-800 bg-zinc-900 shrink-0">
    <div class="text-lg font-bold tracking-widest uppercase text-zinc-100">
      circle <span class="text-cyan-400">revelation</span>
    </div>
    <div class="text-[11px] text-zinc-500 tracking-wider">
      Barycentric Fixed-Mass Coverage · Visual Test Suite
    </div>
  </header>

  <!-- ── Main ── -->
  <div class="flex flex-1 overflow-hidden">

    <!-- Canvas -->
    <div class="relative flex-1 overflow-hidden" bind:this={wrapEl}>
      <svg bind:this={svgEl} class="block w-full h-full" />

      {#if flashVisible}
        <div
          class="absolute bottom-7 left-1/2 -translate-x-1/2 text-3xl font-bold tracking-widest uppercase pointer-events-none animate-fade-in"
          class:text-cyan-400={flashPass}
          class:text-red-400={!flashPass}
        >
          {flashPass ? "✓ PASS" : "✗ FAIL"}&nbsp;&nbsp;{flashPct}%
        </div>
      {/if}
    </div>

    <Sidebar />
  </div>

  <Controls onRun={run} onreset={reset} />

</div>