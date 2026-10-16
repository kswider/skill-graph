// `pnpm db:up`: starts the local Postgres in Docker (plain `docker`, so Colima, OrbStack and Docker Desktop all work,
// or Docker inside WSL on Windows) and waits until it accepts connections. `pnpm db:down` (`--down`) stops it;
// the data stays in the `skill-graph-db` volume.
import { execFileSync, spawnSync } from "node:child_process";
import { dockerCommand } from "./docker.mjs";

const name = "skill-graph-db";
const docker = (...args: string[]) => spawnSync(...dockerCommand(args), { encoding: "utf8" });
const dockerInherit = (...args: string[]) => execFileSync(...dockerCommand(args), { stdio: "inherit" });

if (process.argv.includes("--down")) {
  dockerInherit("stop", name);
  process.exit(0);
}

const inspect = docker("inspect", "-f", "{{.State.Running}}", name);
if (inspect.status !== 0) {
  dockerInherit(
    "run",
    "-d",
    "--name",
    name,
    "-p",
    "5433:5432", // 5433 so it doesn't clash with another local Postgres
    "-e",
    "POSTGRES_USER=skillgraph",
    "-e",
    "POSTGRES_PASSWORD=skillgraph",
    "-e",
    "POSTGRES_DB=skillgraph",
    "-v",
    `${name}:/var/lib/postgresql/data`,
    "postgres:17-alpine",
  );
} else if (inspect.stdout.trim() !== "true") {
  dockerInherit("start", name);
}

// over TCP, so the temporary server Postgres runs during first-time setup (socket only) doesn't count as ready
for (let i = 0; i < 60; i++) {
  if (
    docker("exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "skillgraph", "-d", "skillgraph").status === 0
  ) {
    console.log(`${name} is ready on localhost:5433`);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 1000));
}
console.error(`${name} didn't become ready within 60 s: check \`docker logs ${name}\``);
process.exit(1);
