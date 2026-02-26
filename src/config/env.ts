import dotenv from "dotenv";

dotenv.config({ quiet: true });

const parsePort = (value: string | undefined): number => {
  const parsed = Number(value ?? "3000");

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error("PORT must be a valid integer between 1 and 65535.");
  }

  return parsed;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parsePort(process.env.PORT),
  DATABASE_FILE: process.env.DATABASE_FILE ?? "./dev.db",
} as const;
