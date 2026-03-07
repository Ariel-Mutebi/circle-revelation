<script lang="ts">
  import { Input } from "$lib/components/ui/input";

  interface Props {
    label: string;
    value: number;
    min?: number;
    max?: number;
    onchange: (value: number) => void;
  }

  const { label, value, min, max, onchange }: Props = $props();
</script>

<div class="flex items-center gap-2 text-[11px] text-zinc-500 tracking-wider uppercase">
  {label}
  <Input
    type="number"
    {min} {max} {value}
    oninput={e => onchange(parseInt((e.target as HTMLInputElement).value))}
    class="w-16 h-8 text-[12px]"
  />
</div>