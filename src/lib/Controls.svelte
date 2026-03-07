<script lang="ts">
  import { state } from "$lib/state.js";
  import { Button } from "$lib/components/ui/button";
  import SliderField from "$lib/components/SliderField.svelte";
  import NumberField from "$lib/components/NumberField.svelte";

  const SPEED_LABELS = ["×¼", "×½", "×1", "×2", "MAX"];

  interface Props {
    onRun: () => void;
    onreset: () => void;
  }

  const { onRun, onreset }: Props = $props();
</script>

<footer class="flex items-center gap-4 px-5 py-2.5 border-t border-zinc-800 bg-zinc-900 shrink-0">
  <Button onclick={onRun} disabled={$state.status === "running"} variant="outline">
    ▶ Run Test
  </Button>
  <Button onclick={onreset} disabled={$state.status === "idle"} variant="ghost">
    ↺ Reset
  </Button>

  <SliderField
    label="Speed"
    value={$state.speedIndex}
    min={0}
    max={4}
    display={SPEED_LABELS[$state.speedIndex]}
    onchange={v => state.update(s => ({ ...s, speedIndex: v }))}
  />

  <NumberField
    label="Seed"
    value={$state.seed}
    min={1}
    max={99999}
    onchange={v => state.update(s => ({ ...s, seed: v }))}
  />

  <div class="flex-1"></div>

  <div
    class="text-[10px] tracking-widest uppercase px-2.5 py-1 border transition-colors duration-200"
    class:border-zinc-700={$state.status === "idle"}
    class:text-zinc-500={$state.status === "idle"}
    class:border-amber-400={$state.status === "running"}
    class:text-amber-400={$state.status === "running"}
    class:animate-pulse={$state.status === "running"}
    class:border-cyan-400={$state.status === "done"}
    class:text-cyan-400={$state.status === "done"}
  >
    {$state.status.toUpperCase()}
  </div>
</footer>