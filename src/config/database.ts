import Database from "better-sqlite3";
import path from "node:path";

import { env } from "./env";

const databasePath = path.resolve(process.cwd(), env.DATABASE_FILE);

export const db = new Database(databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export const closeDatabase = (): void => {
  db.close();
};
