<script lang="ts">
  import { getPreferences } from "$ctx";
  import { SettingsTab } from "$lib/components/header/types";
  import { ScrollArea } from "$ui/scroll-area";
  import * as Tabs from "$ui/tabs";
  import Pickaxe from "@lucide/svelte/icons/pickaxe";
  import Settings2 from "@lucide/svelte/icons/settings-2";
  import SettingToggleRow from "./SettingToggleRow.svelte";

  const preferences = getPreferences();
</script>

<Tabs.Content value={SettingsTab.Misc} class="space-y-4">
  <div class="flex flex-col items-start">
    <div class="flex items-center-safe gap-1">
      <Settings2 class="size-6 h-lh shrink-0" />
      <h4 class="text-lg font-semibold">Misc Settings</h4>
    </div>
    <div>
      <div class="space-y-2 text-muted-foreground">
        <p>These settings affect various parts of SkyCrypt.</p>
        <p>They are saved in your browser and will persist across sessions.</p>
      </div>
    </div>
  </div>

  <ScrollArea class="h-fit" type="always" viewportClasses="max-h-96" scrollbarYClasses="py-2">
    <div class="flex flex-col gap-4 pr-3">
      <SettingToggleRow
        id="mctooltip"
        title="Minecraft Styled Tooltips"
        description="Enable Minecraft styled tooltips for items."
        checked={preferences.mctooltip}
        onCheckedChange={() => (preferences.mctooltip = !preferences.mctooltip)}>
        {#snippet icon()}
          <Pickaxe class="size-5 shrink-0" />
        {/snippet}
      </SettingToggleRow>
    </div>
  </ScrollArea>
</Tabs.Content>
