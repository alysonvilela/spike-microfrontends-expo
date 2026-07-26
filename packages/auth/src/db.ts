import { join } from "node:path";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const DB_PATH =
  process.env.DB_PATH ??
  join(import.meta.dirname, "..", "data", "auth.db");

const sqlite = createClient({
  url: `file:${DB_PATH}`,
});

export const db = drizzle(sqlite, { schema });
