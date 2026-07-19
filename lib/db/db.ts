import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "@/utils/configuration/env";

const adapter = new PrismaPg({ connectionString: env.databaseUrl });

export const prismaClient = new PrismaClient({ adapter });
