import { type NextFunction, type Request, type Response } from "express";

import { env } from "../config/env";
import { AppError } from "../utils/app-error";

export const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: "Invalid JSON payload." });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (env.NODE_ENV !== "test") {
    console.error(error);
  }

  res.status(500).json({ error: "Internal server error" });
};
