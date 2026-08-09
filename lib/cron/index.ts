import { expireStaleFocusSessions } from "@/cron/helper/expireFocusSessions";

const ONE_HOUR_MS = 60 * 60 * 1000;

export const initCronJobs = (): void => {
  // Hourly rather than daily: correctness of reads never depends on this
  // (sessionStatus.ts derives "active" live), but a tighter window keeps
  // stale/zombie rows from sitting around for up to a day in dashboards,
  // support tooling, and the Pro 24h safety net.
  void expireStaleFocusSessions();
  setInterval(() => void expireStaleFocusSessions(), ONE_HOUR_MS);
};
