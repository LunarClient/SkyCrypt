<script lang="ts">
  import {
    CombinedContext,
    AllStatsContext,
    getHoverContext,
    getInternalState,
    getPreferences,
    getProfileContext,
    getRecentSearches,
    ProfileContext,
    setAllStatsContext,
    setCombinedContext,
    setProfileContext
  } from "$ctx";
  import Settings from "$lib/components/header/settings";
  import { ContainedItemsGrid, ItemContent } from "$lib/components/item";
  import { Navbar } from "$lib/components/misc";
  import Sections from "$lib/sections/Sections.svelte";
  import type { ModelsCombinedOutput, ModelsStatData, ModelsStatsOutput } from "$lib/shared/api/orval-generated";
  import * as Dialog from "$ui/dialog";
  import * as Drawer from "$ui/drawer";
  import Image from "@lucide/svelte/icons/image";
  import { Avatar } from "bits-ui";
  import { untrack } from "svelte";
  import { cubicOut } from "svelte/easing";
  import { fade } from "svelte/transition";

  const {
    data: ctx,
    allStats,
    combined
  }: {
    data: ModelsStatsOutput;
    allStats: ModelsStatData[];
    combined: ModelsCombinedOutput | null;
  } = $props();

  const isHover = getHoverContext();
  const preferences = getPreferences();
  const recentSearches = getRecentSearches();
  const internalState = getInternalState();

  const profile = $derived(ctx);

  // Initialize the profile context
  const profileClass = new ProfileContext();
  const allStatsClass = new AllStatsContext();
  const combinedClass = new CombinedContext();
  setProfileContext(profileClass);
  setAllStatsContext(allStatsClass);
  setCombinedContext(combinedClass);
  $effect.pre(() => {
    if (!ctx) return;

    const { username, uuid } = ctx;
    if (!username || !uuid) return;

    untrack(() => {
      // Find existing search by username/IGN and update with UUID
      const existingIndex = recentSearches.current.findIndex(
        (search) => search.ign.toLowerCase() === username.toLowerCase()
      );

      if (existingIndex !== -1) {
        // Update existing search with UUID and update IGN in case it changed casing
        recentSearches.current[existingIndex] = {
          ...recentSearches.current[existingIndex],
          ign: username,
          uuid: uuid
        };
      }
    });
  });

  // Update the profile context when the data changes
  $effect.pre(() => {
    profileClass.current = profile;
  });

  $effect.pre(() => {
    combinedClass.current = combined ?? null;
  });

  $effect.pre(() => {
    allStatsClass.current = allStats ?? [];
  });
</script>

<div class="@container/parent relative">
  <!-- TODO: Re-enable paneforge once this is fixed: https://github.com/svecosystem/paneforge/issues/89 -->
  <!-- <PaneGroup id="panes" direction="horizontal" autoSaveId="paneConfig" class="relative w-full !overflow-x-clip !overflow-y-visible">
    {#if innerWidth >= 1024}
      <div class="group/pane contents">
        <Pane
          id="skinPane"
          defaultSize={defaultLeftPanel}
          collapsedSize={0}
          collapsible={true}
          order={0}
          onResize={(size) => {
            leftSize = size;
            if (size < 15) {
              leftPane.collapse();
              skinCollapsed = true;
            } else {
              leftPane.expand();
              skinCollapsed = false;
            }
          }}
          bind:this={leftPane}>
          <div class="relative flex h-full items-center justify-center">
            <div class="fixed top-1/2 z-10 -translate-y-1/2">
              {#if !skinCollapsed}
                {#if preferences.performanceMode}
                  <Avatar.Root>
                    {#snippet child({ props })}
                      <div transition:fade={{ duration: 300, easing: cubicOut }} {...props}>
                        <Avatar.Image loading="lazy" src="https://nmsr.nickac.dev/fullbody/{profile.uuid}?no=shadow" alt="{profile.username}'s avatar" class="max-h-[32rem] object-cover" />
                        <Avatar.Fallback>
                          <Image class="size-24 object-cover text-foreground" />
                        </Avatar.Fallback>
                      </div>
                    {/snippet}
                  </Avatar.Root>
                {:else if browser && innerWidth >= 1024}
                   {#await import('$lib/components/misc/Skin3D.svelte') then { default: Skin3D }}
                    <Skin3D class="h-full" />
                  {/await}
                {/if}
              {/if}
            </div>
          </div>
        </Pane>

        <PaneResizer class="fixed top-1/2 left-(--size) z-20 flex w-2 -translate-x-1 -translate-y-[calc(50%-1.5rem)] items-center justify-center rounded-xs opacity-30 transition-opacity duration-300 ease-out group-hover/pane:opacity-100" style="--size: {leftSize}%">
          <div class="absolute h-[50dvh] w-2 rounded-xs bg-primary transition-[clip-path] duration-300 ease-out [clip-path:inset(50%_0_50%_0)] group-hover/pane:[clip-path:inset(0_0_0_0)]"></div>

          <div class="z-10 flex h-7 min-w-5 items-center justify-center rounded-xl bg-muted transition-colors duration-300 ease-out group-hover/pane:bg-primary">
            <GripVertical class="size-4 text-foreground/80" />
          </div>
        </PaneResizer>
      </div>
    {/if}

    <Pane
      id="statsPane"
      defaultSize={defaultRightPanel}
      class="relative z-10 !overflow-x-clip !overflow-y-visible"
      order={1}
      onResize={(size) => {
        rightSize = size;
      }}>
      <div class="fixed top-0 right-0 h-dvh w-(--width) glass dark:glass-brightness-50 light:glass-brightness-100" style="--width: {skinCollapsed ? 100 : rightSize}%"></div>
      <main data-vaul-drawer-wrapper class="@container relative mx-auto mt-12">
        <div class="space-y-5 p-4 @[75rem]/parent:p-8">
          <PlayerProfile />
          <Skills />
          <Stats />
          <AdditionalStats />
        </div>

        <Navbar>
          <Sections />
        </Navbar>
      </main>
    </Pane>
  </PaneGroup> -->
  <!-- TODO: See the paneforge todo above  -->
  <div class="fixed top-0 left-0 z-20 hidden w-fit @[75rem]/parent:block">
    <Settings />
  </div>
  <div class="flex h-dvh w-full">
    <div class="@container relative hidden h-full w-[30vw] shrink-0 @[75rem]/parent:block">
      <Avatar.Root class="flex size-full items-center justify-center">
        {#snippet child({ props })}
          <div transition:fade={{ duration: 300, easing: cubicOut }} {...props}>
            <Avatar.Image
              loading="lazy"
              src="https://nmsr.nickac.dev/fullbody/{profile.uuid}?no=shadow"
              alt="{profile.username}'s avatar"
              class="max-h-128 object-cover" />
            <Avatar.Fallback>
              <Image class="size-24 object-cover text-foreground" />
            </Avatar.Fallback>
          </div>
        {/snippet}
      </Avatar.Root>
    </div>
    <div class="relative h-full w-full flex-1 overflow-y-auto @[75rem]/parent:w-[calc(100%-30vw)]">
      <main data-vaul-drawer-wrapper class="@container relative mx-auto">
        {#if getProfileContext().current}
          <Navbar>
            <Sections />
          </Navbar>
        {/if}
      </main>
    </div>
  </div>
</div>

{#if isHover.current}
  <Dialog.Root bind:open={internalState.showItem}>
    <Dialog.Content
      class="flex max-h-[calc(96%-3rem)]! w-auto max-w-[calc(100vw-2.5rem)]! flex-col gap-0 overflow-hidden glass p-0 font-skyblock-icons select-text glass-bg-popover data-[mctooltip=true]:rounded-sm data-[mctooltip=true]:ring-0 *:data-[slot='dialog-close']:hidden standard:bg-transparent"
      data-mctooltip={preferences.mctooltip}>
      <ItemContent piece={internalState.itemContent!} />
    </Dialog.Content>
  </Dialog.Root>
  <Dialog.Root
    bind:open={() => internalState.itemContentSpecial !== undefined, (open) => open}
    onOpenChange={(open) => {
      if (!open) {
        internalState.itemContentSpecial = undefined;
      }
    }}>
    <Dialog.Content
      class="flex max-h-[calc(96%-3rem)]! w-auto max-w-[calc(100vw-2.5rem)]! flex-col overflow-hidden glass p-0 font-skyblock-icons select-text glass-bg-popover *:data-[slot='dialog-close']:hidden standard:bg-transparent">
      {#if internalState.itemContentSpecial?.containsItems}
        <ContainedItemsGrid
          items={internalState.itemContentSpecial.containsItems}
          onclose={() => (internalState.itemContentSpecial = undefined)} />
      {/if}
    </Dialog.Content>
  </Dialog.Root>
{:else}
  <Drawer.Root bind:open={internalState.showItem} shouldScaleBackground={true} setBackgroundColorOnScale={false}>
    <Drawer.Content
      class="p-2 before:glass before:p-0 before:glass-bg-popover standard:dark:before:bg-transparent [&>div:first-child]:hidden!">
      <ItemContent piece={internalState.itemContent!} isDrawer={true} />
    </Drawer.Content>
  </Drawer.Root>
  <Drawer.Root
    bind:open={() => internalState.itemContentSpecial !== undefined, (open) => open}
    shouldScaleBackground={false}
    setBackgroundColorOnScale={false}
    onOpenChange={(open) => {
      if (!open) {
        internalState.itemContentSpecial = undefined;
      }
    }}>
    <Drawer.Content class="before:glass before:bg-transparent before:glass-bg-popover [&>div:first-child]:my-4">
      {#if internalState.itemContentSpecial?.containsItems}
        <ContainedItemsGrid
          items={internalState.itemContentSpecial.containsItems}
          onclose={() => (internalState.itemContentSpecial = undefined)} />
      {/if}
    </Drawer.Content>
  </Drawer.Root>
{/if}

{#if preferences.showGlint}
  <svg xmlns="http://www.w3.org/2000/svg" height="0" width="0" class="fixed">
    <filter id="enchanted-glint">
      <feImage href="/img/enchanted-glint.gif" preserveAspectRatio="none" result="IMAGE"></feImage>
      <feBlend in="IMAGE" in2="SourceGraphic" mode="screen" result="BLEND"></feBlend>
      <feComposite operator="in" in="BLEND" in2="SourceGraphic"></feComposite>
    </filter>
  </svg>
{/if}
