// One-off/rerunnable seed for the Bee customization tab's appearance
// registry. Upserts by the stable `key`, so running this again after adding
// a new Pro skin to the list below is always safe — existing rows are
// updated in place, never duplicated. Mirrors scripts/seed-work-types.ts.
import { prismaClient } from "@/db/db";
import { WorkTypeTier } from "@prisma/client";

const LAUNCH_SKINS = [
  {
    key: "classic-honey",
    label: "Classic Honey",
    tier: WorkTypeTier.FREE,
    bodyPrimary: "#f0cb7a",
    bodySecondary: "#a67b1f",
    stripe: "#1a1a1a",
  },
  {
    key: "midnight",
    label: "Midnight",
    tier: WorkTypeTier.FREE,
    bodyPrimary: "#6b6b6b",
    bodySecondary: "#2a2a2a",
    stripe: "#ffffff",
  },
  {
    key: "royal",
    label: "Royal",
    tier: WorkTypeTier.PRO,
    bodyPrimary: "#c79ee8",
    bodySecondary: "#6a3f94",
    stripe: "#2a1338",
  },
  {
    key: "blossom",
    label: "Blossom",
    tier: WorkTypeTier.PRO,
    bodyPrimary: "#f4a6b8",
    bodySecondary: "#c65b78",
    stripe: "#4a1a26",
  },
];

async function main() {
  for (const skin of LAUNCH_SKINS) {
    await prismaClient.beeSkin.upsert({
      where: { key: skin.key },
      update: {
        label: skin.label,
        tier: skin.tier,
        bodyPrimary: skin.bodyPrimary,
        bodySecondary: skin.bodySecondary,
        stripe: skin.stripe,
      },
      create: skin,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${LAUNCH_SKINS.length} bee skins.`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(() => prismaClient.$disconnect());
