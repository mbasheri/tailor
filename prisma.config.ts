import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7 reads CLI configuration from here (schema location, migration
// datasource, seed command). Runtime connections go through the pg driver
// adapter in src/lib/prisma.ts.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
