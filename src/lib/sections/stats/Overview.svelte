<script lang="ts">
  import Skills from "$lib/layouts/stats/Skills.svelte";
  import Section from "$lib/components/Section.svelte";
  import Stats from "$lib/layouts/stats/Stats.svelte";
  import AdditionalStats from "$lib/layouts/stats/AdditionalStats.svelte";

  let { order }: { order: number } = $props();
</script>

<Section id="Overview" {order}>
  <div class="space-y-5">
    <Skills/>
    <Stats />
    <AdditionalStats />
  </div>
</Section>