// One-off/rerunnable seed for the Bee's Hive environment registry. Upserts
// by the stable `key`, so running this again after adding a new Pro theme
// to the list below is always safe — existing rows are updated in place,
// never duplicated. Mirrors scripts/seed-bee-skins.ts.
import { prismaClient } from "@/db/db";
import { WorkTypeTier } from "@prisma/client";

const LAUNCH_THEMES = [
  {
    key: "golden-hour",
    label: "Golden Hour",
    tier: WorkTypeTier.FREE,
    skyTop: "#bfe3f7",
    skyBottom: "#eaf6e0",
    wallTop: "#6b4a2c",
    wallBottom: "#4a3018",
    floorTop: "#8a6238",
    floorBottom: "#5c3f21",
    lanternGlow: "#ffe9ad",
  },
  {
    key: "moonlit",
    label: "Moonlit",
    tier: WorkTypeTier.FREE,
    skyTop: "#16213a",
    skyBottom: "#3d5a80",
    wallTop: "#3a4152",
    wallBottom: "#242a38",
    floorTop: "#4a5568",
    floorBottom: "#2b3240",
    lanternGlow: "#cde3ff",
  },
  {
    key: "spring-bloom",
    label: "Spring Bloom",
    tier: WorkTypeTier.PRO,
    skyTop: "#eaf6e4",
    skyBottom: "#cdeccb",
    wallTop: "#8a6a5c",
    wallBottom: "#6b4a3c",
    floorTop: "#a67b5c",
    floorBottom: "#7a5638",
    lanternGlow: "#ffd6e8",
  },
];

async function main() {
  for (const theme of LAUNCH_THEMES) {
    await prismaClient.hiveTheme.upsert({
      where: { key: theme.key },
      update: {
        label: theme.label,
        tier: theme.tier,
        skyTop: theme.skyTop,
        skyBottom: theme.skyBottom,
        wallTop: theme.wallTop,
        wallBottom: theme.wallBottom,
        floorTop: theme.floorTop,
        floorBottom: theme.floorBottom,
        lanternGlow: theme.lanternGlow,
      },
      create: theme,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${LAUNCH_THEMES.length} hive themes.`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(() => prismaClient.$disconnect());
