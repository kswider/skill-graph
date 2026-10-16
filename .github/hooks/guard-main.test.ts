import { describe, expect, it } from "vitest";
import { check } from "./guard-main.mjs";

const on = (branch: string) => () => branch;

describe("guard-main hook", () => {
  it("blocks commits and merges on main", () => {
    expect(check("git commit -m 'x'", ".", on("main"))).toMatch(/commit/);
    expect(check("git merge feat/x", ".", on("main"))).toMatch(/merge/);
    expect(check("git commit -m 'x'", ".", on("feat/x"))).toBeNull();
  });

  it("blocks pushes to main and force pushes", () => {
    expect(check("git push origin main", ".", on("feat/x"))).toMatch(/pushing to main/);
    expect(check("git push origin HEAD:main", ".", on("feat/x"))).toMatch(/pushing to main/);
    expect(check("git push", ".", on("main"))).toMatch(/pushing to main/);
    expect(check("git push --force-with-lease", ".", on("feat/x"))).toMatch(/force/);
    expect(check("git push -u origin feat/x", ".", on("feat/x"))).toBeNull();
  });

  it("blocks --no-verify and admin merges", () => {
    expect(check("git commit --no-verify -m x", ".", on("feat/x"))).toMatch(/no-verify/);
    expect(check("gh pr merge 3 --admin", ".", on("feat/x"))).toMatch(/admin/);
    expect(check("gh pr merge 3 --auto --squash --delete-branch", ".", on("feat/x"))).toBeNull();
  });

  it("understands PowerShell commands from Copilot's terminal", () => {
    expect(check("git switch main; git pull --ff-only; git commit -m x", ".", on("main"))).toMatch(/commit/);
    expect(check("& git.exe commit -m x", ".", on("main"))).toMatch(/commit/);
    expect(check("& 'C:\\Program Files\\Git\\cmd\\git.exe' push", ".", on("main"))).toMatch(/pushing/);
  });

  it("checks the branch of the directory the command runs in", () => {
    const dirs: string[] = [];
    const branchOf = (dir: string) => (dirs.push(dir), "feat/x");
    check("Set-Location -Path other; git commit -m x", "/repo", branchOf);
    check("git -C sub commit -m x", "/repo", branchOf);
    expect(dirs.map((d) => d.replaceAll("\\", "/").replace(/^[A-Za-z]:/, ""))).toEqual([
      "/repo/other",
      "/repo/sub",
    ]);
  });

  it("ignores commands that are not git or gh", () => {
    expect(check("view", ".", on("main"))).toBeNull();
    expect(check("pnpm check", ".", on("main"))).toBeNull();
  });
});
