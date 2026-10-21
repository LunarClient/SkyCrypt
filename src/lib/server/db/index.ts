import { DATABASE_URL } from "$app/env/private";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazily initialise the database connection. Importing this module must not
// throw when DATABASE_URL is unset: the SvelteKit build's `analyse` step imports
// every server module, and the Cloudflare embed deployment runs without a DB.
// The check + connection are deferred until `db` is actually queried.
let instance: PostgresJsDatabase<typeof schema> | undefined;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (!instance) {
    if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");
    const client = postgres(DATABASE_URL);
    instance = drizzle(client, { schema });
  }
  return instance;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDb(), prop, receiver);
    return typeof value === "function" ? value.bind(getDb()) : value;
  }
});
