<script lang="ts">
  interface Props {
    color: string;
    dashed?: boolean;
    dot?: boolean;
    label: string;
  }

  const { color, dashed = false, dot = false, label }: Props = $props();
</script>

<div class="flex items-center gap-2 text-[11px] text-zinc-300">
  {#if dot}
    <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:{color}"></span>
  {:else}
    <span
      class="w-6 h-3 shrink-0 rounded-sm"
      style="background:{color}; border: 1.5px {dashed ? 'dashed' : 'solid'} {color}"
    ></span>
  {/if}
  {label}
</div>