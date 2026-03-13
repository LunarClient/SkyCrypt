import type { ThemeV3 } from "$lib/shared/themes";

export const lunarTheme = {
  schema: 3,
  light: false,
  colors: {
    logo: "oklch(68.48% 0.2338 351.45)",
    link: "oklch(81.56% 0.04 260)",
    icon: "oklch(73.62% 0.03 260)",
    hover: "oklch(83.81% 0.025 260)",
    maxed: "oklch(72.84% 0.1506 75.86)",
    gold: "oklch(82.84% 0.1548 78.27)"
  },
  backgrounds: {
    skillbar: {
      type: "color",
      color: "oklch(63.98% 0.028 260)"
    },
    maxedbar: {
      type: "color",
      color: "oklch(69.69% 0.1423 76.74)"
    }
  },
  minecraft: {
    palette: "nice-light",
    overrides: undefined
  },
  metadata: {
    id: "lunar",
    name: "Lunar Theme",
    author: "Lunar Client",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1
  }
} satisfies ThemeV3;