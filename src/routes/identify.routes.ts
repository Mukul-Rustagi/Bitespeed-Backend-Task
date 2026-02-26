import { Router } from "express";

import { healthController, identifyController } from "../controllers/identify.controller";
import { validateIdentifyRequest } from "../middlewares/validate-identify.middleware";

const identifyRouter = Router();

identifyRouter.get("/health", healthController);
identifyRouter.post("/identify", validateIdentifyRequest, identifyController);

export { identifyRouter };
