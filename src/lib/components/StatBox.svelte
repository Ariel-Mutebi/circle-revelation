<script lang="ts">
  interface Props {
    label: string;
    value: string | number;
    highlighted?: boolean;
  }

  const { label, value, highlighted = false }: Props = $props();
</script>

<div class="bg-zinc-950 border border-zinc-800 p-2">
  <div class="text-[9px] tracking-widest uppercase text-zinc-500">{label}</div>
  <div class="text-2xl font-bold leading-tight transition-colors duration-200"
    class:text-zinc-100={!highlighted}
    class:text-cyan-400={highlighted}
  >
    {value}
  </div>
</div>