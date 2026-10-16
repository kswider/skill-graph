// `pnpm dev:local`: starts the local Postgres (`db:up`), applies pending migrations and the (idempotent) seed,
// then runs `next dev`. Creates `.env.local` from `.env.example` on the first run.
// With Docker inside WSL, an idle WSL shuts down and takes the database with it, so a keep-alive runs alongside the app.
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { viaWsl } from "./docker.mjs";

if (!existsSync(".env.local")) {
  copyFileSync(".env.example", ".env.local");
  console.log("Created .env.local from .env.example");
}

const run = (script: string) => {
  const { status } = spawnSync("pnpm", [script], { stdio: "inherit", shell: true });
  if (status !== 0) process.exit(status ?? 1);
};
run("db:up");
run("db:migrate");
run("db:seed");

const keepAlive = viaWsl ? spawn("wsl", ["-e", "sleep", "infinity"], { stdio: "ignore" }) : null;
const app = spawn("pnpm", ["exec", "next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
});
app.on("exit", (code) => {
  keepAlive?.kill();
  process.exit(code ?? 0);
});
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => app.kill(signal));
