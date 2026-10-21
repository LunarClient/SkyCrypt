<script lang="ts">
  import { PUBLIC_DISCORD_INVITE, PUBLIC_PATREON } from "$app/env/public";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { getFavorites } from "$ctx";
  import { getContributors } from "$routes/contributors.remote";
  import { Button } from "$ui/button";
  import * as ButtonGroup from "$ui/button-group";
  import { Input } from "$ui/input";
  import { Skeleton } from "$ui/skeleton";
  import { Spinner } from "$ui/spinner";
  import * as Tooltip from "$ui/tooltip";
  import CodeXml from "@lucide/svelte/icons/code-xml";
  import GitPullRequestArrow from "@lucide/svelte/icons/git-pull-request-arrow";
  import SearchIcon from "@lucide/svelte/icons/search";
  import Server from "@lucide/svelte/icons/server";
  import Star from "@lucide/svelte/icons/star";
  import { isHttpError } from "@sveltejs/kit";
  import { onMount } from "svelte";
  import { ContributorCard, ContributorCardSkeleton, CtaCard } from "#lib/components/misc";
  import { Notice } from "#lib/components/notices";
  import { resolveUuidByUsername } from "#lib/shared/api/skycrypt-api.remote";
  import { Role } from "./enums";
  import { schema } from "./schema";

  const favorites = getFavorites();

  let searchQuery = $state<string>(null!);
  const searchQueryValidated = $derived(schema.safeParse({ query: searchQuery }));

  let submittedSearchLoading = $state(false);
  let submittedSearchError = $state<string>();

  function getErrorMessage(err: unknown) {
    const httpError = err as { body?: unknown };

    if (
      isHttpError(err) &&
      typeof httpError.body === "object" &&
      httpError.body !== null &&
      "message" in httpError.body &&
      typeof httpError.body.message === "string"
    ) {
      return httpError.body.message;
    }

    return "Something went wrong";
  }

  const iconMapper: Record<Role, typeof CodeXml | typeof Server | typeof GitPullRequestArrow | typeof Star | string> = {
    [Role.MAINTAINER]: CodeXml,
    [Role.FACILITATOR]: Server,
    [Role.CONTRIBUTOR]: GitPullRequestArrow,
    [Role.FAVORITE]: Star,
    [Role.TECHNOBLADE]: "/img/icons/technoblade.svg"
  };

  type Cta = {
    href: string;
    text: { title: string; description: string };
    img: { src: string; alt: string };
  };

  const ctas: Cta[] = [
    {
      href: PUBLIC_PATREON,
      text: {
        title: "Patreon",
        description: "Help keep SkyCrypt ad free by donating"
      },
      img: {
        src: "/img/icons/patreon.svg",
        alt: "Patreon logo"
      }
    },
    {
      href: PUBLIC_DISCORD_INVITE,
      text: {
        title: "Discord",
        description: "Announcements, Community, Bug Reports, Feature Requests, Support"
      },
      img: {
        src: "/img/icons/discord.svg",
        alt: "Discord logo"
      }
    }
  ];

  let selectedCta = $state<Cta>();

  async function submitSearch() {
    if (!searchQueryValidated.success) return;

    const username = searchQuery.trim();
    if (!username) return;

    submittedSearchLoading = true;
    submittedSearchError = undefined;

    try {
      const response = await resolveUuidByUsername({ username });
      await goto(resolve("/stats/[ign=ign]/[[profile=profile]]", { ign: response.username ?? "" }));
    } catch (err) {
      submittedSearchError = getErrorMessage(err);
    } finally {
      submittedSearchLoading = false;
    }
  }

  onMount(() => {
    selectedCta = ctas[Math.floor(Math.random() * ctas.length)];
  });
</script>

<main
  class="@container mx-auto mt-4 flex max-w-272 flex-col justify-center gap-4 overscroll-y-contain pr-[max(1.25rem+env(safe-area-inset-right))] pb-[max(1.25rem+env(safe-area-inset-bottom))] pl-[max(1.25rem+env(safe-area-inset-left))]">
  <div
    class="flex w-full flex-col items-center-safe justify-center-safe gap-4 rounded-xl border glass p-4 text-3xl glass-brightness-150 glass-contrast-60 dark:glass-brightness-50 dark:glass-contrast-100">
    <div class="flex flex-col justify-center gap-2">
      <div class="flex flex-col items-center-safe justify-center-safe gap-4">
        <div>
          <h1 class="text-center text-3xl font-bold">SkyCrypt</h1>
          <h2 class="text-center text-xl font-semibold text-muted-foreground">
            A beautiful site for sharing your SkyBlock profile 🍣
          </h2>
        </div>

        <ButtonGroup.Root class="h-16 w-full">
          <Input
            id="search"
            type="search"
            required
            autofocus
            placeholder="Enter username"
            class="h-full w-full grow font-medium md:text-lg"
            bind:value={searchQuery}
            onchange={() => void submitSearch()}
            onkeydown={(e) => {
              if (e.key.toLowerCase() === "enter" || e.key.toLowerCase() === "search") {
                e.preventDefault();
                void submitSearch();
              }
            }} />

          <Button
            variant="outline"
            disabled={searchQuery != null && searchQuery.length > 0 && !searchQueryValidated.success}
            onclick={() => void submitSearch()}
            class="h-full">
            {#if submittedSearchLoading}
              <Spinner class="size-4" />
            {:else}
              <SearchIcon class="size-4" />
            {/if}
          </Button>
        </ButtonGroup.Root>

        {#if !searchQueryValidated.success && searchQuery != null && searchQuery.length > 0}
          <div class="text-center text-sm font-semibold text-destructive">
            {searchQueryValidated.error.issues[0].message}
          </div>
        {/if}
        {#if submittedSearchError}
          <div class="text-center text-sm font-semibold text-destructive">{submittedSearchError}</div>
        {/if}
      </div>
    </div>

    {#if selectedCta}
      <CtaCard href={selectedCta.href} text={selectedCta.text} img={selectedCta.img} />
    {:else}
      <Skeleton class="h-18.5 w-2/4 rounded-xl" />
    {/if}
  </div>

  <!-- No newsroom section: posts are read from Postgres, which the embed does not have. -->
  <Tooltip.Provider delayDuration={75} skipDelayDuration={75}>
    <div class="grid grid-cols-1 gap-5 @xl:grid-cols-2 @5xl:grid-cols-3">
      {#if favorites.current.length === 0}
        <ContributorCard
          user={{ id: "0", username: "No favorites set!", quote: "Why don't you set a favorite?" }}
          options={{ tip: true }}
          {iconMapper} />
      {:else}
        {#each favorites.current.toReversed() as favorite, index (index)}
          <ContributorCard
            user={{ id: favorite.uuid, username: favorite.ign, role: Role.FAVORITE }}
            options={{ favorite: true }}
            {iconMapper} />
        {/each}
      {/if}

      <svelte:boundary>
        {#snippet pending()}
          {#each new Array(3 * 4) as _, index (index)}
            <ContributorCardSkeleton />
          {/each}
        {/snippet}
        {#snippet failed(err, retry)}
          <Notice title="Failed to load contributors." type="error" error={err} {retry} class="col-span-full" />
        {/snippet}

        {#each await getContributors(__PRERENDER_VERSION__) as contributor (contributor.id)}
          <ContributorCard user={contributor} {iconMapper} />
        {/each}
      </svelte:boundary>
    </div>
  </Tooltip.Provider>
</main>
