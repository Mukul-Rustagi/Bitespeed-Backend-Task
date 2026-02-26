import { app } from "./app";
import { closeDatabase } from "./config/database";
import { env } from "./config/env";

const port = env.PORT;

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

const shutdown = async (): Promise<void> => {
  server.close(async () => {
    closeDatabase();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
