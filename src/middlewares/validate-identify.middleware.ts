import { type NextFunction, type Request, type Response } from "express";

import { AppError } from "../utils/app-error";

export const validateIdentifyRequest = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const body = req.body as { email?: unknown; phoneNumber?: unknown } | undefined;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    next(new AppError(400, "Request body must be a JSON object containing email and/or phoneNumber."));
    return;
  }

  const { email, phoneNumber } = body;
  const emailTypeValid = typeof email === "undefined" || email === null || typeof email === "string";
  const phoneTypeValid =
    typeof phoneNumber === "undefined" ||
    phoneNumber === null ||
    typeof phoneNumber === "string" ||
    typeof phoneNumber === "number";

  if (!emailTypeValid || !phoneTypeValid) {
    next(new AppError(400, "email must be string|null and phoneNumber must be string|number|null."));
    return;
  }

  next();
};
