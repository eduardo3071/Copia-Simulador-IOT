import { buildServer } from "./server.ts";

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";

const app = buildServer({ logger: true });
try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => void app.close().then(() => process.exit(0)));
}