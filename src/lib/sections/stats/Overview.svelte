<script lang="ts">
  import Skills from "$lib/layouts/stats/Skills.svelte";
  import Section from "$lib/components/Section.svelte";
  import Stats from "$lib/layouts/stats/Stats.svelte";
  import AdditionalStats from "$lib/layouts/stats/AdditionalStats.svelte";
  import PlayerProfile from "$lib/layouts/stats/PlayerProfile.svelte";

  let { order }: { order: number } = $props();
</script>

<Section id="Overview" {order}>
  <div class="space-y-5">
    <PlayerProfile />
    <Skills />
    <Stats />
    <AdditionalStats />
  </div>
</Section>
