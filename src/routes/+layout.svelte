<script lang="ts">
  import { building } from "$app/env";
  import { browser, dev } from "$app/env";
  import {
    PUBLIC_UMAMI_ENABLE_HEATMAPS,
    PUBLIC_UMAMI_HOST_URL,
    PUBLIC_UMAMI_RECORDER_URL,
    PUBLIC_UMAMI_SCRIPT_URL,
    PUBLIC_UMAMI_WEBSITE_ID
  } from "$app/env/public";
  import { beforeNavigate, goto } from "$app/navigation";
  import { page, updated } from "$app/state";
  import {
    initEnabledPacks,
    initFavorites,
    initInternalState,
    initPreferences,
    initRecentSearches,
    initTheme,
    PacksContext,
    setHoverContext,
    setMobileContext,
    setPacksContext
  } from "$ctx";
  import * as Drawer from "$ui/drawer";
  import * as Sheet from "$ui/sheet";
  import Wifi from "@lucide/svelte/icons/wifi";
  import WifiOff from "@lucide/svelte/icons/wifi-off";
  import { Tooltip } from "bits-ui";
  import { mode, ModeWatcher, setMode } from "mode-watcher";
  import { onDestroy, onMount, type Snippet } from "svelte";
  import SvelteSeo from "svelte-seo";
  import { toast, Toaster, type ToasterProps } from "svelte-sonner";
  import { SvelteURLSearchParams } from "svelte/reactivity";
  import { writable } from "svelte/store";
  import { CommandPalette, JsonLd, PerformanceMode } from "#lib/components/misc";
  import { IsHover } from "#lib/hooks/is-hover.svelte.js";
  import { IsMobile } from "#lib/hooks/is-mobile.svelte.js";
  import "./layout.css";
  import { listResourcePacks } from "#lib/shared/api/skycrypt-api.remote";
  import { isBeta } from "#lib/shared/release-channel";

  let { children }: { children: Snippet } = $props();
  const loadThemeEditor = () => import("#lib/components/theme-editor/ThemeEditor.svelte");
  let isMobile = $state(new IsMobile());
  let isHover = $state(new IsHover());
  let toastId: string | number = $state(0);
  let commandLoading = $state(false);

  const { ign } = $derived(page.params);
  const preferences = initPreferences();
  const enabledPacks = initEnabledPacks();
  const themeContext = initTheme();
  const internalState = initInternalState();
  const position = writable<ToasterProps["position"]>("bottom-right");
  const theme = writable<ToasterProps["theme"]>("dark");
  const noEmbedUrls = ["/stats/", "/newsroom", "/login", "/dashboard"];
  const packs = new PacksContext();
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://sky.shiiyu.moe/#website",
    name: "SkyCrypt",
    url: "https://sky.shiiyu.moe",
    description: "A beautiful site for sharing your SkyBlock profile 🍣",
    publisher: {
      "@type": "Organization",
      "@id": "https://sky.shiiyu.moe/#organization",
      name: "SkyCrypt",
      url: "https://sky.shiiyu.moe",
      logo: "https://sky.shiiyu.moe/img/app-icons/512.png"
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://sky.shiiyu.moe/stats/{search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  } as const;

  function updateOnlineStatus() {
    toast.dismiss(toastId);
    toastId = toast.loading("Checking connection status...");

    setTimeout(() => {
      if (navigator.onLine) {
        toast.dismiss(toastId);

        toastId = toast.success("You are now online!", {
          icon: Wifi,
          description: "Connection has been restored!",
          duration: 5000
        });
      } else {
        toast.dismiss(toastId);

        toastId = toast.error("You are now offline!", {
          icon: WifiOff,
          description: "Please check your connection and try again.",
          duration: 5000
        });
      }
    }, 1000);
  }

  function handleKeydown(e: KeyboardEvent) {
    // Single-key shortcuts must not steal characters typed into fields.
    if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]")) return;
    if (e.key === preferences.keybind) {
      e.preventDefault();
      internalState.openCommand = true;
    }
    if (e.key.toLowerCase() === "p" && dev) {
      // toggle performance mode for testing
      preferences.performanceMode = !preferences.performanceMode;
    }
    if (e.key.toLowerCase() === "m" && dev) {
      // toggle minecraft styled tooltips for testing
      preferences.mctooltip = !preferences.mctooltip;
    }
    if (e.key.toLowerCase() === "t" && dev) {
      // toggle minecraft styled tooltips for testing
      setMode(mode.current === "light" ? "dark" : "light");
    }
  }

  function handleOutboundClick(event: MouseEvent) {
    // Cast target to Element or HTMLElement so .closest() is recognized
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest("a");
    if (!anchor || !anchor.href) return;

    // Only track outbound links that don't already have a custom Umami event
    const isOutbound = anchor.host && anchor.host !== window.location.host;
    const hasCustomEvent = anchor.hasAttribute("data-umami-event");

    if (isOutbound && !hasCustomEvent && typeof umami !== "undefined") {
      umami.track("outbound-link-click", { url: anchor.href });
    }
  }

  initFavorites();
  initRecentSearches();
  setMobileContext(isMobile);
  setHoverContext(isHover);
  setPacksContext(packs);

  onMount(() => {
    if (window.innerWidth <= 600) {
      position.set("bottom-center");
    }

    // Upstream shows a "Performance Mode Locked" toast here when performanceModeForced is set.
    // Intentionally omitted: the embed always runs in performance mode (the GameUI browser has
    // no hardware acceleration), so the warning is noise for every user.
  });

  onDestroy(() => {
    isHover.destroy();
  });

  beforeNavigate(({ type, shallow }) => {
    if (shallow && type === "goto") return;
    if (type === "leave" || type === "link") return;

    commandLoading = true;

    setTimeout(() => {
      commandLoading = false;
      internalState.openCommand = false;
    }, 1000);
  });

  beforeNavigate(({ willUnload, to, shallow, type }) => {
    if (shallow && type === "goto") return;

    if (updated.current && !willUnload && to?.url) {
      location.href = to.url.href;
    }
  });

  $effect.pre(() => {
    const urlParams = new SvelteURLSearchParams(window.location.search);
    const themeParam = urlParams.get("theme");
    if (themeParam) {
      toast.promise(
        import("#lib/shared/themes/sharing")
          .then(({ parseThemeFromURL }) => parseThemeFromURL(window.location.href))
          .then((decoded) => {
            if (decoded) {
              themeContext.saveTheme(decoded);
              internalState.themeEditorId = decoded.metadata.id;
              internalState.themeEditorOpen = true;
            }
          })
          .catch((err) => {
            console.error("Failed to decode theme from URL:", err);
          })
          .finally(() => {
            // Clean up URL to prevent re-parsing on reload
            urlParams.delete("theme");
            const newUrl = `${page.url.pathname}${urlParams.toString() ? "?" + urlParams.toString() : ""}${page.url.hash}`;
            // eslint-disable-next-line svelte/no-navigation-without-resolve
            goto(newUrl, { shallow: true, replace: true, state: page.state });
          }),
        {
          loading: "Importing theme...",
          success: "Theme imported successfully!",
          error: "Failed to import theme."
        }
      );
    }
    return () => {
      // Clean up URL on unmount just in case
      const urlParams = new SvelteURLSearchParams(window.location.search);
      if (urlParams.has("theme")) {
        urlParams.delete("theme");
        const newUrl = `${page.url.pathname}${urlParams.toString() ? "?" + urlParams.toString() : ""}${page.url.hash}`;
        // eslint-disable-next-line svelte/no-navigation-without-resolve
        goto(newUrl, { shallow: true, replace: true, state: page.state });
      }
    };
  });

  $effect(() => {
    const query = listResourcePacks(__PRERENDER_VERSION__);
    if (Array.isArray(query.current)) {
      packs.packs = query.current;
      enabledPacks.configure(query.current);
    }
  });

  let innerWidth = $state(0);
</script>

<ModeWatcher
  defaultMode="dark"
  defaultTheme="default"
  themeStorageKey="skycryptActiveTheme"
  darkClassNames={["dark"]}
  lightClassNames={["light"]}
  themeColors={{ dark: "#282828", light: "#dbdbdb" }} />

<svelte:document onkeydown={handleKeydown} onclick={handleOutboundClick}></svelte:document>

<svelte:window
  onresize={() => {
    if (innerWidth <= 600) {
      position.set("bottom-center");
    } else {
      position.set("bottom-right");
    }
  }}
  bind:innerWidth
  ononline={updateOnlineStatus}
  onoffline={updateOnlineStatus} />

<svelte:head>
  {#if !noEmbedUrls.some((url) => page.url.pathname.startsWith(url))}
    <link rel="icon" href="/favicon.png" sizes="32x32" type="image/png" />
  {/if}
  {#if PUBLIC_UMAMI_SCRIPT_URL && PUBLIC_UMAMI_WEBSITE_ID && !building}
    <script
      defer
      src={PUBLIC_UMAMI_SCRIPT_URL}
      data-website-id={PUBLIC_UMAMI_WEBSITE_ID}
      data-host-url={PUBLIC_UMAMI_HOST_URL}></script>
    {#if PUBLIC_UMAMI_ENABLE_HEATMAPS === "true" && PUBLIC_UMAMI_RECORDER_URL}
      <script
        defer
        src={PUBLIC_UMAMI_RECORDER_URL}
        data-website-id={PUBLIC_UMAMI_WEBSITE_ID}
        data-host-url={PUBLIC_UMAMI_HOST_URL}></script>
    {/if}
  {/if}
</svelte:head>

{#if !noEmbedUrls.some((url) => page.url.pathname.startsWith(url))}
  <SvelteSeo
    title="SkyCrypt"
    description="A beautiful site for sharing your SkyBlock profile 🍣"
    canonical={page.url.pathname === "/"
      ? "https://sky.shiiyu.moe/"
      : `https://sky.shiiyu.moe${page.url.pathname.replace(/\/$/, "")}`}
    openGraph={{
      title: "SkyBlock Stats",
      description: "A beautiful site for sharing your SkyBlock profile 🍣",
      site_name: "SkyCrypt",
      url:
        page.url.pathname === "/"
          ? "https://sky.shiiyu.moe/"
          : `https://sky.shiiyu.moe${page.url.pathname.replace(/\/$/, "")}`,
      type: "website",
      images: [
        {
          url: "https://sky.shiiyu.moe/img/app-icons/512.png",
          width: 512,
          height: 512,
          alt: "SkyCrypt Logo"
        }
      ]
    }}
    twitter={{
      card: "summary",
      title: "SkyBlock Stats",
      description: "A beautiful site for sharing your SkyBlock profile 🍣",
      image: "https://sky.shiiyu.moe/img/app-icons/512.png",
      imageAlt: "SkyCrypt Logo"
    }}
    manifest="/manifest.webmanifest" />
  <JsonLd data={websiteJsonLd} />
{/if}

<Toaster
  theme={$theme}
  closeButton={isHover.current}
  position={$position}
  class="sm:mr-8"
  pauseWhenPageIsHidden={true}
  toastOptions={{
    class: "standard:glass! performance:bg-popover! gap-2! rounded-xl! border! text-foreground!",

    classes: {
      closeButton: "bg-secondary!",
      description: "text-pretty!",
      title: "text-pretty!"
    }
  }} />

{#if isBeta || dev}
  {#await import("#lib/components/notices/BetaNotice.svelte") then { default: BetaNotice }}
    <BetaNotice />
  {/await}
{/if}

{#if browser && !preferences.performanceMode}
  <PerformanceMode />
{/if}

<Tooltip.Provider delayDuration={0}>
  {@render children()}
</Tooltip.Provider>

<CommandPalette {ign} bind:loading={commandLoading} />

{#if !isMobile.current}
  <Sheet.Root bind:open={internalState.themeEditorOpen}>
    <Sheet.Content
      side="left"
      class="top-12! h-[calc(100%-3rem)]! w-[30%]! max-w-none! overflow-y-auto glass p-4 glass-bg-popover *:data-dialog-close:border *:data-dialog-close:border-border *:data-dialog-close:bg-transparent standard:bg-transparent!"
      showOverlay={false}
      escapeKeydownBehavior="ignore"
      interactOutsideBehavior="ignore"
      preventScroll={false}>
      {#await loadThemeEditor() then { default: ThemeEditor }}
        <ThemeEditor />
      {/await}
    </Sheet.Content>
  </Sheet.Root>
{/if}

{#if isMobile.current}
  <Drawer.Root bind:open={internalState.themeEditorOpen} shouldScaleBackground={true}>
    <Drawer.Content
      class="before:glass before:glass-bg-popover standard:dark:before:bg-transparent [&>div:first-child]:my-4">
      <div class="overflow-auto p-4">
        {#await loadThemeEditor() then { default: ThemeEditor }}
          <ThemeEditor />
        {/await}
      </div>
    </Drawer.Content>
  </Drawer.Root>
{/if}

{#if !isHover.current}
  <Drawer.Root
    bind:open={() => !!internalState.content, (v) => v}
    shouldScaleBackground={false}
    setBackgroundColorOnScale={false}
    onOpenChange={(open) => {
      if (!open) internalState.content = undefined;
    }}>
    <Drawer.Content class="before:glass before:bg-transparent before:glass-bg-popover">
      <div class="mx-auto w-full overflow-auto p-6">
        {@render internalState.content?.()}
      </div>
    </Drawer.Content>
  </Drawer.Root>
{/if}
