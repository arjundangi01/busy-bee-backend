import "dotenv/config";
import { ENV } from "@/utils/enums/enums";

const parsePort = (raw: string | undefined): number => {
  const parsed = Number(raw);
  return raw && !Number.isNaN(parsed) ? parsed : 4000;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required — copy .env.example to .env and set it");
}

export const env = {
  port: parsePort(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL,
  mode: (process.env.NODE_ENV as ENV) ?? ENV.DEVELOPMENT,
};
