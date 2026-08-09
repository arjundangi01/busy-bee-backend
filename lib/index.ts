import { createServer } from "@/server";
import { env } from "@/utils/configuration/env";
import { initCronJobs } from "@/cron";

const app = createServer();

const server = app.listen(env.port, () => {
  console.log(`Server listening on port ${env.port}`);
  initCronJobs();
});

server.on("error", (error) => {
  console.error("Server failed to start:", error.message);
  process.exit(1);
});
