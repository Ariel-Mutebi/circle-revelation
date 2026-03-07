<script lang="ts">
  import { Progress } from "$lib/components/ui/progress";

  interface Props {
    value: number;
    total: number | null;
  }

  const { value, total }: Props = $props();
</script>

<div class="mt-1">
  <div class="flex justify-between text-[10px] text-zinc-500 mb-1.5">
    <span>Coverage</span>
    <span class="text-zinc-300">{total ? value + "%" : "—"}</span>
  </div>
  <Progress value={total ? value : 0} max={100} />
</div>