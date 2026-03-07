<script lang="ts">
  import { state, coverage, assertionPassed } from "$lib/state.js";
  import { Badge } from "$lib/components/ui/badge";
  import { Separator } from "$lib/components/ui/separator";
  import { ScrollArea } from "$lib/components/ui/scroll-area";
  import PanelTitle from "$lib/components/PanelTitle.svelte";
  import StatBox from "$lib/components/StatBox.svelte";
  import CoverageBar from "$lib/components/CoverageBar.svelte";
  import LegendRow from "$lib/components/LegendRow.svelte";
  import LogRow from "$lib/components/LogRow.svelte";
</script>

<aside class="flex flex-col overflow-hidden border-l border-zinc-800 bg-zinc-900 w-70">

  <!-- ── Telemetry ── -->
  <section class="p-4 shrink-0">
    <PanelTitle title="Telemetry" />
    <div class="grid grid-cols-2 gap-1.5 mb-2.5">
      <StatBox label="API Calls" value={$state.callCount} />
      <StatBox label="Found" value={$state.foundCount} highlighted={$state.foundCount > 0} />
      <StatBox label="True Total" value={$state.trueTotal ?? "—"} />
      <StatBox label="Last Yield" value={$state.lastYield ?? "—"} />
    </div>
    <CoverageBar value={$coverage} total={$state.trueTotal} />
    {#if $assertionPassed !== null}
      <div class="mt-2.5">
        <Badge variant={$assertionPassed ? "default" : "destructive"}>
          {$assertionPassed ? "✓ PASS" : "✗ FAIL"} — ≥ 80% coverage ({$coverage}%)
        </Badge>
      </div>
    {/if}
  </section>

  <Separator />

  <!-- ── Legend ── -->
  <section class="p-4 shrink-0">
    <PanelTitle title="Legend" />
    <div class="flex flex-col gap-1.5">
      <LegendRow color="rgba(255,184,48,0.8)" dashed label="Initial search circle" />
      <LegendRow color="rgba(48,208,240,0.85)" label="Dense probe (yield = 20)" />
      <LegendRow color="rgba(255,184,48,0.5)" label="Sparse probe (yield < 20)" />
      <LegendRow color="rgba(48,208,240,0.85)" dot label="Discovered place" />
      <LegendRow color="rgba(255,184,48,0.35)" dot label="Undiscovered place" />
    </div>
  </section>

  <Separator />

  <!-- ── Query log ── -->
  <div class="p-4 pb-0 shrink-0">
    <PanelTitle title="Query Log" />
  </div>
  <ScrollArea class="flex-1 px-4 pb-3">
    {#each $state.log as entry (entry.callIndex)}
      <LogRow {entry} />
    {/each}
  </ScrollArea>

</aside>