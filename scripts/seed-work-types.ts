// One-off/rerunnable seed for Bee's Hive's work-type registry
// (design-artifacts/evolution/specs/03-companion-work-types.md). Upserts by
// the stable `key`, so running this again after adding a new Pro type to
// the list below is always safe — existing rows are updated in place, never
// duplicated.
import { prismaClient } from "@/db/db";
import { WorkTypeTier } from "@prisma/client";

const LAUNCH_WORK_TYPES = [
  { key: "honeycomb-building", label: "Honeycomb Building", tier: WorkTypeTier.FREE, totalUnits: 12 },
  { key: "flower-collecting", label: "Flower & Pollen Collecting", tier: WorkTypeTier.FREE, totalUnits: 10 },
];

async function main() {
  for (const workType of LAUNCH_WORK_TYPES) {
    await prismaClient.workType.upsert({
      where: { key: workType.key },
      update: { label: workType.label, tier: workType.tier, totalUnits: workType.totalUnits },
      create: workType,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Seeded ${LAUNCH_WORK_TYPES.length} work types.`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(() => prismaClient.$disconnect());
