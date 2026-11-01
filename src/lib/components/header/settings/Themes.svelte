<script lang="ts">
  import { getThemeContext } from "$ctx";
  import { Label } from "$ui/label";
  import { ScrollArea } from "$ui/scroll-area";
  import * as Tabs from "$ui/tabs";
  import Check from "@lucide/svelte/icons/check";
  import PaintBucket from "@lucide/svelte/icons/paint-bucket";
  import { RadioGroup } from "bits-ui";
  import { mode } from "mode-watcher";
  import { SettingsTab } from "#lib/components/header/types";
  import { readDefaultThemeCssVars } from "#lib/shared/themes/computed-css-vars";
  import { FIRST_PARTY_THEMES } from "#lib/shared/themes/first-party";
  import type { ThemeModeName, ThemeV5 } from "#lib/shared/themes/schema";

  const themeContext = getThemeContext();

  function getThemeSwatchColors(theme: ThemeV5): string[] {
    const defaultCssVars = readDefaultThemeCssVars();
    const modeName: ThemeModeName = mode.current === "light" ? "light" : "dark";
    const vars = theme.modes[modeName].cssVars;
    return (["chart1", "chart3", "chart5"] as const).map(
      (key) =>
        vars[key] ?? vars.primary ?? defaultCssVars[key] ?? defaultCssVars.primary ?? "oklch(0.627 0.194 149.214)"
    );
  }
</script>

{#snippet swatch(theme: ThemeV5)}
  {const [front, middle, back] = getThemeSwatchColors(theme)}
  <svg
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="0.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="size-10 shrink-0 stroke-border text-foreground"
    aria-hidden="true">
    <path fill={back} d="M11 13h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H7a4 4 0 0 0 4-4Z" />
    <path fill={middle} d="m11 8 2.3-2.3a2.4 2.4 0 0 1 3.404.004L18.6 7.6a2.4 2.4 0 0 1 .026 3.434L9.9 19.8Z" />
    <path
      fill={front}
      fill-rule="evenodd"
      d="M11 17a4 4 0 0 1-8 0V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2ZM5.5 17a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0Z" />
  </svg>
{/snippet}

<Tabs.Content value={SettingsTab.Themes} class="space-y-4">
  <div class="flex flex-col items-start">
    <div class="flex items-center-safe gap-1">
      <PaintBucket class="size-6 h-lh shrink-0" />
      <h4 class="text-lg font-semibold">Themes</h4>
    </div>
    <div>
      <div class="space-y-2 text-muted-foreground">
        <p>Themes change the colors of SkyCrypt.</p>
      </div>
    </div>
  </div>

  <ScrollArea class="mt-4 h-fit" type="always" viewportClasses="max-h-96" scrollbarYClasses="py-2">
    <RadioGroup.Root class="flex flex-col gap-4 pr-3" bind:value={themeContext.current}>
      <h5 class="text-sm font-semibold">Official Themes</h5>
      {#each FIRST_PARTY_THEMES as theme (theme.metadata.id)}
        <Label for={theme.metadata.id} class="flex items-center justify-between gap-4 rounded-xl border p-2">
          <div class="flex items-center gap-2">
            {@render swatch(theme)}
            <div class="flex flex-col">
              <h4 class="font-semibold text-foreground/90">{theme.metadata.name}</h4>
              <p class="overflow-hidden font-normal text-ellipsis whitespace-nowrap text-muted-foreground">
                by
                <span class="text-foreground/80">{theme.metadata.author}</span>
              </p>
            </div>
          </div>
          <RadioGroup.Item
            id={theme.metadata.id}
            value={theme.metadata.id}
            class="group inline-flex h-6 min-h-6 w-10 shrink-0 cursor-pointer items-center rounded-full px-0 transition-colors ease-out">
            <Check class="size-6 text-primary group-data-[state=unchecked]:invisible" />
          </RadioGroup.Item>
        </Label>
      {/each}
    </RadioGroup.Root>
  </ScrollArea>
</Tabs.Content>
