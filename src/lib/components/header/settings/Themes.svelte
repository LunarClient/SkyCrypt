<script lang="ts">
  import { getThemeContext } from "$ctx";
  import { SettingsTab } from "$lib/components/header/types";
  import { getThemeIcons } from "$lib/shared/api/themes.remote";
  import { readDefaultThemeCssVars } from "$lib/shared/themes/computed-css-vars";
  import { FIRST_PARTY_THEMES } from "$lib/shared/themes/first-party";
  import type { ThemeModeName, ThemeV5 } from "$lib/shared/themes/schema";
  import { Label } from "$ui/label";
  import { ScrollArea } from "$ui/scroll-area";
  import * as Tabs from "$ui/tabs";
  import Check from "@lucide/svelte/icons/check";
  import PaintBucket from "@lucide/svelte/icons/paint-bucket";
  import { Avatar, RadioGroup } from "bits-ui";
  import { mode } from "mode-watcher";

  const themeContext = getThemeContext();

  function getThemeIconColor(theme: ThemeV5): string {
    const defaultCssVars = readDefaultThemeCssVars();
    const modeName: ThemeModeName = mode.current === "light" ? "light" : "dark";
    const vars = theme.modes[modeName].cssVars;
    return (
      vars.sidebarPrimary ??
      vars.chart2 ??
      vars.primary ??
      defaultCssVars.sidebarPrimary ??
      defaultCssVars.chart2 ??
      defaultCssVars.primary ??
      "oklch(0.627 0.194 149.214)"
    );
  }

  function getThemeIconKey(theme: ThemeV5): string {
    const iconColor = getThemeIconColor(theme);
    const modeName = mode.current === "light" ? "light" : "dark";
    return `${theme.metadata.id}:${modeName}:${iconColor}:${mode.current === "light"}`;
  }
</script>

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
        {#key getThemeIconKey(theme)}
          {#await getThemeIcons({ color: getThemeIconColor(theme), invert: mode.current === "light" }) then iconSvg}
            {const iconDataUrl = `data:image/svg+xml;base64,${btoa(iconSvg)}`}
            <Label for={theme.metadata.id} class="flex items-center justify-between gap-4 rounded-xl border p-2">
              <div class="flex items-center gap-2">
                <Avatar.Root class="shrink-0 select-none">
                  <Avatar.Image
                    loading="lazy"
                    src={iconDataUrl}
                    alt={theme.metadata.name}
                    class="pointer-events-none aspect-square size-10 h-full rounded-xl select-none"></Avatar.Image>
                  <Avatar.Fallback class="flex items-center rounded-xl text-center font-semibold uppercase"
                    >{theme.metadata.name.slice(0, 2)}</Avatar.Fallback>
                </Avatar.Root>
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
          {/await}
        {/key}
      {/each}
    </RadioGroup.Root>
  </ScrollArea>
</Tabs.Content>
