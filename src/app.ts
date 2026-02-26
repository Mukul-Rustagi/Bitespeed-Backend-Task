import express from "express";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/not-found.middleware";
import { identifyRouter } from "./routes/identify.routes";

export const app = express();

app.use(express.json());

app.use("/", identifyRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
