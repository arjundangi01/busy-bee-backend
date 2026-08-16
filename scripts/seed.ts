// Demo-account seed for Play Store screenshots (Home / Progress / Bee's
// Hive). Builds a realistic history around test@gmail.com so the three
// screens show a believable streak, focus history, distraction stats, and
// unlocked Bee's Hive customization instead of an empty first-run state.
// Rerunnable: wipes and rebuilds this one user's data every run, so running
// `npm run prisma:seed` again while iterating on screenshots is always safe.
import { prismaClient } from "../lib/db/db";
import { hashPassword } from "../lib/utils/helpers/password";
import {
  AuthProvider,
  SessionEndReason,
  SubscriptionProvider,
  SubscriptionStatus,
  TaskStatus,
  WorkTypeTier,
} from "@prisma/client";

const DEMO_EMAIL = "test@gmail.com";
const DEMO_PASSWORD = "homeishere@123";
const DEMO_NAME = "Jordan Avery";

// Mirrors scripts/seed-work-types.ts / seed-bee-skins.ts / seed-hive-themes.ts
// exactly, so this script is self-sufficient on a fresh database even if
// those haven't been run yet.
const LAUNCH_WORK_TYPES = [
  {
    key: "honeycomb-building",
    label: "Honeycomb Building",
    tier: WorkTypeTier.FREE,
    totalUnits: 12,
  },
  {
    key: "flower-collecting",
    label: "Flower & Pollen Collecting",
    tier: WorkTypeTier.FREE,
    totalUnits: 10,
  },
];

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

const BLOCKED_APPS = [
  { packageName: "com.instagram.android", appName: "Instagram" },
  { packageName: "com.google.android.youtube", appName: "YouTube" },
  { packageName: "com.twitter.android", appName: "X" },
  { packageName: "com.zhiliaoapp.musically", appName: "TikTok" },
];
// Weighted so Instagram is the clear "top distraction" on the Progress tab.
const DISTRACTION_ROTATION = [0, 0, 1, 3, 0, 2];

const NON_BLOCKED_APPS = [
  { packageName: "com.google.android.apps.messaging", appName: "Messages" },
  { packageName: "com.android.chrome", appName: "Chrome" },
];

// One mission template per "day" of seeded history, cycled by offset. Every
// task is completed in order, spread evenly across that day's session.
const MISSION_TEMPLATES = [
  {
    title: "Inbox zero catch-up",
    estimatedMinutes: 30,
    tasks: [
      "Sort unread emails",
      "Reply to urgent threads",
      "Archive the rest",
    ],
  },
  {
    title: "Draft Q3 client proposal",
    estimatedMinutes: 60,
    tasks: [
      "Outline proposal sections",
      "Write pricing summary",
      "Proofread and format",
      "Send for review",
    ],
  },
  {
    title: "Deep clean the kitchen",
    estimatedMinutes: 45,
    tasks: ["Clear counters and dishes", "Wipe down surfaces", "Mop the floor"],
  },
  {
    title: "Study for certification exam",
    estimatedMinutes: 50,
    tasks: ["Review chapter notes", "Take practice quiz", "Flag weak topics"],
  },
  {
    title: "Plan weekend trip itinerary",
    estimatedMinutes: 40,
    tasks: [
      "Research destinations",
      "Book accommodation",
      "List packing essentials",
    ],
  },
  {
    title: "Organize garage shelves",
    estimatedMinutes: 55,
    tasks: [
      "Sort tools by category",
      "Label storage bins",
      "Sweep and tidy floor",
    ],
  },
  {
    title: "Write blog post draft",
    estimatedMinutes: 45,
    tasks: ["Brainstorm outline", "Write first draft", "Edit intro paragraph"],
  },
  {
    title: "Prep client presentation slides",
    estimatedMinutes: 50,
    tasks: [
      "Build slide outline",
      "Design key visuals",
      "Rehearse talking points",
    ],
  },
  {
    title: "Declutter home office",
    estimatedMinutes: 35,
    tasks: [
      "Sort loose papers",
      "Donate unused items",
      "Reorganize desk drawer",
    ],
  },
  {
    title: "Meal prep for the week",
    estimatedMinutes: 40,
    tasks: ["Plan five dinners", "Chop vegetables", "Portion into containers"],
  },
  {
    title: "Finish freelance logo design",
    estimatedMinutes: 60,
    tasks: [
      "Sketch three concepts",
      "Refine chosen direction",
      "Export final files",
    ],
  },
  {
    title: "Read 30 pages of research",
    estimatedMinutes: 35,
    tasks: [
      "Skim chapter summary",
      "Read core sections",
      "Jot down key takeaways",
    ],
  },
];

const HISTORY_DAYS = 62;
const UNIT_SECONDS = 200;

// Hand-shaped hit/miss pattern (0 = today, higher = further in the past) —
// a believable "back on a streak after a slump, with one great run further
// back" story rather than a suspiciously perfect all-green calendar:
//   0-13   : hit  -> current streak = 14 days
//   14     : miss
//   15-21  : hit
//   22     : miss
//   23-34  : hit
//   35     : miss
//   36-39  : hit
//   40     : miss
//   41-61  : hit  -> longest run = 21 days -> best streak
const isHitOffset = (offset: number): boolean => {
  if (offset <= 13) return true;
  if (offset === 14) return false;
  if (offset <= 21) return true;
  if (offset === 22) return false;
  if (offset <= 34) return true;
  if (offset === 35) return false;
  if (offset <= 39) return true;
  if (offset === 40) return false;
  return true;
};

const dateAtOffset = (offsetDays: number, hour: number, minute = 0): Date => {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - offsetDays,
      hour,
      minute,
    ),
  );
};

const workTypeForOffset = (
  offset: number,
  ids: { honeycombId: string; flowerId: string },
): string => (offset < 15 ? ids.flowerId : ids.honeycombId);

const totalUnitsFor = (
  workTypeId: string,
  ids: { honeycombId: string; flowerId: string },
): number => (workTypeId === ids.flowerId ? 10 : 12);

let distractionCursor = 0;
const nextDistraction = (): (typeof BLOCKED_APPS)[number] =>
  BLOCKED_APPS[
    DISTRACTION_ROTATION[distractionCursor++ % DISTRACTION_ROTATION.length]
  ];

async function upsertRegistries() {
  for (const workType of LAUNCH_WORK_TYPES) {
    await prismaClient.workType.upsert({
      where: { key: workType.key },
      update: {
        label: workType.label,
        tier: workType.tier,
        totalUnits: workType.totalUnits,
      },
      create: workType,
    });
  }
  for (const skin of LAUNCH_SKINS) {
    await prismaClient.beeSkin.upsert({
      where: { key: skin.key },
      update: skin,
      create: skin,
    });
  }
  for (const theme of LAUNCH_THEMES) {
    await prismaClient.hiveTheme.upsert({
      where: { key: theme.key },
      update: theme,
      create: theme,
    });
  }
}

// Creates one completed Mission + its Tasks + one MISSION_COMPLETED
// FocusSession (+ matching BlockedAttemptEvents) for a single day of history.
async function seedHitDay(
  userId: string,
  offset: number,
  workIds: { honeycombId: string; flowerId: string },
): Promise<void> {
  const template = MISSION_TEMPLATES[offset % MISSION_TEMPLATES.length];
  const hour = offset % 5 === 0 ? 10 : 9;
  const startedAt = dateAtOffset(offset, hour, 5);
  const elapsedSeconds = 1200 + ((offset * 97) % 1500);
  const endedAt = new Date(startedAt.getTime() + elapsedSeconds * 1000);
  const blockedAttemptCount = (offset * 3 + 1) % 4;
  const workTypeId = workTypeForOffset(offset, workIds);
  const totalUnits = totalUnitsFor(workTypeId, workIds);
  const workUnitsCompleted = Math.min(
    totalUnits,
    Math.floor(elapsedSeconds / UNIT_SECONDS),
  );

  const mission = await prismaClient.mission.create({
    data: {
      userId,
      title: template.title,
      estimatedMinutes: template.estimatedMinutes,
      status: "COMPLETED",
      createdAt: new Date(startedAt.getTime() - 5 * 60 * 1000),
      completedAt: endedAt,
    },
  });

  const segment = elapsedSeconds / template.tasks.length;
  for (let i = 0; i < template.tasks.length; i += 1) {
    const taskStart = new Date(startedAt.getTime() + segment * i * 1000);
    const taskEnd =
      i === template.tasks.length - 1
        ? endedAt
        : new Date(startedAt.getTime() + segment * (i + 1) * 1000);
    await prismaClient.missionTask.create({
      data: {
        missionId: mission.id,
        title: template.tasks[i],
        order: i,
        status: TaskStatus.DONE,
        startedAt: taskStart,
        completedAt: taskEnd,
      },
    });
  }

  const session = await prismaClient.focusSession.create({
    data: {
      missionId: mission.id,
      startedAt,
      endedAt,
      expiredAt: new Date(startedAt.getTime() + 24 * 60 * 60 * 1000),
      elapsedSeconds,
      sessionEndReason: SessionEndReason.MISSION_COMPLETED,
      blockedAttemptCount,
      workTypeId,
      workUnitsCompleted,
    },
  });

  for (let i = 0; i < blockedAttemptCount; i += 1) {
    const app = nextDistraction();
    await prismaClient.blockedAttemptEvent.create({
      data: {
        focusSessionId: session.id,
        packageName: app.packageName,
        occurredAt: new Date(
          startedAt.getTime() +
            (elapsedSeconds / (blockedAttemptCount + 1)) * (i + 1) * 1000,
        ),
      },
    });
  }
}

// A same-day false start before the real session — gives the Progress tab a
// "bounced back" data point and a rough-session badge.
async function seedFalseStart(
  userId: string,
  offset: number,
  workTypeId: string,
): Promise<void> {
  const mission = await prismaClient.mission.create({
    data: {
      userId,
      title: "Quick email check",
      status: "ACTIVE",
      createdAt: dateAtOffset(offset, 7, 30),
    },
  });
  await prismaClient.missionTask.create({
    data: {
      missionId: mission.id,
      title: "Reply to one email",
      order: 0,
      status: TaskStatus.PENDING,
    },
  });

  const startedAt = dateAtOffset(offset, 7, 30);
  const endedAt = new Date(startedAt.getTime() + 5 * 60 * 1000);
  const session = await prismaClient.focusSession.create({
    data: {
      missionId: mission.id,
      startedAt,
      endedAt,
      expiredAt: new Date(startedAt.getTime() + 24 * 60 * 60 * 1000),
      elapsedSeconds: 300,
      sessionEndReason: SessionEndReason.EARLY_EXIT,
      blockedAttemptCount: 4,
      workTypeId,
      workUnitsCompleted: 0,
    },
  });

  for (let i = 0; i < 4; i += 1) {
    const app = nextDistraction();
    await prismaClient.blockedAttemptEvent.create({
      data: {
        focusSessionId: session.id,
        packageName: app.packageName,
        occurredAt: new Date(startedAt.getTime() + i * 60 * 1000),
      },
    });
  }
}

// Today's live, un-ended session — powers Home's "Focus session in
// progress" card and the Focus Session screen's in-progress state.
async function seedActiveSession(
  userId: string,
  flowerWorkTypeId: string,
): Promise<void> {
  const createdAt = new Date(Date.now() - 20 * 60 * 1000);
  const mission = await prismaClient.mission.create({
    data: {
      userId,
      title: "Prep tomorrow's presentation slides",
      estimatedMinutes: 30,
      status: "ACTIVE",
      createdAt,
    },
  });

  const tasks = [
    {
      title: "Outline key slides",
      status: TaskStatus.DONE,
      startedAt: createdAt,
      completedAt: new Date(createdAt.getTime() + 6 * 60 * 1000),
    },
    {
      title: "Add supporting charts",
      status: TaskStatus.DONE,
      startedAt: new Date(createdAt.getTime() + 6 * 60 * 1000),
      completedAt: new Date(createdAt.getTime() + 12 * 60 * 1000),
    },
    {
      title: "Rehearse delivery",
      status: TaskStatus.PENDING,
      startedAt: new Date(createdAt.getTime() + 12 * 60 * 1000),
      completedAt: null,
    },
    {
      title: "Time the full run-through",
      status: TaskStatus.PENDING,
      startedAt: null,
      completedAt: null,
    },
  ];
  for (let i = 0; i < tasks.length; i += 1) {
    await prismaClient.missionTask.create({
      data: {
        missionId: mission.id,
        title: tasks[i].title,
        order: i,
        status: tasks[i].status,
        startedAt: tasks[i].startedAt,
        completedAt: tasks[i].completedAt,
      },
    });
  }

  await prismaClient.focusSession.create({
    data: {
      missionId: mission.id,
      startedAt: createdAt,
      endedAt: null,
      expiredAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
      elapsedSeconds: null,
      sessionEndReason: null,
      blockedAttemptCount: 0,
      workTypeId: flowerWorkTypeId,
      workUnitsCompleted: 0,
    },
  });
}

async function seedUsageStats(userId: string): Promise<void> {
  for (let offset = 0; offset <= 7; offset += 1) {
    const date = dateAtOffset(offset, 0).toISOString().slice(0, 10);

    const appRows = [
      { ...BLOCKED_APPS[0], foregroundSeconds: 2400 + ((offset * 53) % 900) },
      { ...BLOCKED_APPS[1], foregroundSeconds: 1500 + ((offset * 41) % 600) },
      { ...BLOCKED_APPS[2], foregroundSeconds: 900 + ((offset * 31) % 500) },
      { ...BLOCKED_APPS[3], foregroundSeconds: 600 + ((offset * 23) % 400) },
      {
        ...NON_BLOCKED_APPS[0],
        foregroundSeconds: 500 + ((offset * 17) % 300),
      },
      {
        ...NON_BLOCKED_APPS[1],
        foregroundSeconds: 1200 + ((offset * 29) % 500),
      },
    ];
    for (const app of appRows) {
      await prismaClient.appUsageDaily.create({
        data: {
          userId,
          date,
          packageName: app.packageName,
          appName: app.appName,
          foregroundSeconds: app.foregroundSeconds,
        },
      });
    }

    await prismaClient.deviceActivityDaily.create({
      data: {
        userId,
        date,
        pickupCount: 55 + ((offset * 7) % 30),
        firstPickupAt: dateAtOffset(offset, 7, 10),
        lastPickupAt: dateAtOffset(offset, 22, 45),
        offlineSeconds: 14400 + ((offset * 211) % 7200),
      },
    });
  }
}

async function main() {
  await upsertRegistries();

  const honeycomb = await prismaClient.workType.findUniqueOrThrow({
    where: { key: "honeycomb-building" },
  });
  const flower = await prismaClient.workType.findUniqueOrThrow({
    where: { key: "flower-collecting" },
  });
  const royalSkin = await prismaClient.beeSkin.findUniqueOrThrow({
    where: { key: "royal" },
  });
  const springBloomTheme = await prismaClient.hiveTheme.findUniqueOrThrow({
    where: { key: "spring-bloom" },
  });
  const workIds = { honeycombId: honeycomb.id, flowerId: flower.id };

  const user = await prismaClient.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: DEMO_NAME,
      passwordHash: hashPassword(DEMO_PASSWORD),
      authProvider: AuthProvider.EMAIL,
      backgroundExecutionGranted: true,
      notificationsGranted: true,
      pushNotificationsEnabled: true,
      eodNudgeEnabled: true,
      occupation: "Product Designer",
      age: 28,
      bio: "Building better focus, one honeycomb at a time.",
      blocklistDefaultsSeeded: true,
      accessibilityPrimingShown: true,
      selectedWorkTypeId: flower.id,
      selectedSkinId: royalSkin.id,
      selectedThemeId: springBloomTheme.id,
      createdAt: dateAtOffset(HISTORY_DAYS - 1, 8),
    },
    create: {
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      passwordHash: hashPassword(DEMO_PASSWORD),
      authProvider: AuthProvider.EMAIL,
      backgroundExecutionGranted: true,
      notificationsGranted: true,
      pushNotificationsEnabled: true,
      eodNudgeEnabled: true,
      occupation: "Product Designer",
      age: 28,
      bio: "Building better focus, one honeycomb at a time.",
      blocklistDefaultsSeeded: true,
      accessibilityPrimingShown: true,
      selectedWorkTypeId: flower.id,
      selectedSkinId: royalSkin.id,
      selectedThemeId: springBloomTheme.id,
      createdAt: dateAtOffset(HISTORY_DAYS - 1, 8),
    },
  });

  // Clean slate for this one user so the script is safe to rerun.
  await prismaClient.mission.deleteMany({ where: { userId: user.id } });
  await prismaClient.blockedApp.deleteMany({ where: { userId: user.id } });
  await prismaClient.appUsageDaily.deleteMany({ where: { userId: user.id } });
  await prismaClient.deviceActivityDaily.deleteMany({
    where: { userId: user.id },
  });
  await prismaClient.subscription.deleteMany({ where: { userId: user.id } });

  await prismaClient.subscription.create({
    data: {
      userId: user.id,
      status: SubscriptionStatus.ACTIVE,
      provider: SubscriptionProvider.ANDROID,
      productId: "pro_annual",
      originalTransactionId: "seed-demo-tx-001",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      autoRenewing: true,
    },
  });

  for (const app of BLOCKED_APPS) {
    await prismaClient.blockedApp.create({
      data: {
        userId: user.id,
        packageName: app.packageName,
        appName: app.appName,
      },
    });
  }

  for (let offset = HISTORY_DAYS - 1; offset >= 0; offset -= 1) {
    if (!isHitOffset(offset)) continue;
    await seedHitDay(user.id, offset, workIds);
  }
  await seedFalseStart(user.id, 3, flower.id);
  await seedActiveSession(user.id, flower.id);

  await seedUsageStats(user.id);

  // eslint-disable-next-line no-console
  console.log(
    `Seeded demo account ${DEMO_EMAIL} / ${DEMO_PASSWORD} (userId ${user.id}).`,
  );
  // eslint-disable-next-line no-console
  console.log(
    "Expect: 14-day current streak, 21-day best streak, Pro unlocked, one live focus session.",
  );
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(() => prismaClient.$disconnect());
