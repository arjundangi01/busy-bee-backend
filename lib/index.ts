import { createServer } from "@/server";
import { env } from "@/utils/configuration/env";

const app = createServer();

app.listen(env.port, () => {
  console.log(`Server listening on port ${env.port}`);
});
