<script lang="ts">
  interface Props {
    title: string;
  }

  const { title }: Props = $props();
</script>

<h2 class="text-[10px] tracking-widest uppercase text-zinc-500 mb-2.5">
  {title}
</h2>