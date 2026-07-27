export type IIngestAppUsageItem = {
  packageName: string;
  appName: string;
  foregroundSeconds: number;
};

export type IIngestDeviceActivity = {
  pickupCount: number;
  firstPickupAtMillis: number | null;
  lastPickupAtMillis: number | null;
  offlineSeconds: number;
};

// Posted once per day from the usage-stats native module's on-device
// aggregate (design-artifacts/evolution/specs/
// 11-insights-screen-time-and-device-activity.md) — never streamed as raw
// events.
export type IIngestDailyUsagePayload = {
  date: string;
  appUsage: IIngestAppUsageItem[];
  deviceActivity: IIngestDeviceActivity;
};
