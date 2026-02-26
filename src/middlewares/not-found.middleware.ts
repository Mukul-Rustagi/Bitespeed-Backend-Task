import { type NextFunction, type Request, type Response } from "express";

import { AppError } from "../utils/app-error";

export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found.`));
};
