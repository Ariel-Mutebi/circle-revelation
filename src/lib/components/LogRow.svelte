<script lang="ts">
  import type { LogEntry } from "$lib/state.js";

  interface Props {
    entry: LogEntry;
  }

  const { entry }: Props = $props();
</script>

<div class="flex items-baseline gap-2 text-[10px] py-0.5 border-b border-zinc-800 text-zinc-500">
  <span class="text-cyan-400 min-w-7.5">#{entry.callIndex + 1}</span>
  <span class="flex-1">{entry.radiusKm}km</span>
  <span class="text-amber-400">{entry.yielded}/20</span>
  {#if entry.newIds > 0}
    <span class="text-zinc-600 text-[9px]">+{entry.newIds} new</span>
  {/if}
</div>