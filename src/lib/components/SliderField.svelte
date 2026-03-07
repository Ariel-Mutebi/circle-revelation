<script lang="ts">
  import { Slider } from "$lib/components/ui/slider";

  interface Props {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    display: string;
    onchange: (value: number) => void;
  }

  const { label, value, min, max, step = 1, display, onchange }: Props = $props();
</script>

<div class="flex items-center gap-2 text-[11px] text-zinc-500 tracking-wider uppercase">
  {label}
  <Slider
    {min} {max} {step}
    value={[value]}
    type="multiple"
    onValueChange={(value) => onchange(value[0])}
    class="w-20"
  />
  <span class="text-zinc-300 min-w-7">{display}</span>
</div>