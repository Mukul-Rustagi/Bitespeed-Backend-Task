import { type NextFunction, type Request, type Response } from "express";

import { type IdentifyRequestBody } from "../models/contact.model";
import { identifyContact } from "../services/identify.service";

export const identifyController = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const payload = req.body as IdentifyRequestBody;
    const result = identifyContact(payload);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const healthController = (_req: Request, res: Response): void => {
  res.status(200).json({ status: "ok" });
};
