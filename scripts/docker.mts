import { spawnSync } from "node:child_process";

// On Windows, Docker may be installed only inside WSL; WSL forwards the container's ports to localhost
export const viaWsl =
  process.platform === "win32" && spawnSync("docker", ["--version"], { stdio: "ignore" }).status !== 0;

export const dockerCommand = (args: string[]): [string, string[]] =>
  viaWsl ? ["wsl", ["docker", ...args]] : ["docker", args];
