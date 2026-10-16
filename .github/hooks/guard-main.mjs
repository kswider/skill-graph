#!/usr/bin/env node
/**
 * PreToolUse hook that keeps every change on a feature branch, shared by Claude Code (.claude/settings.json)
 * and GitHub Copilot in VS Code (.github/hooks/guard-main.json). It reads `tool_input.command` from the payload,
 * so it works for Claude's Bash tool and Copilot's terminal tool (bash or PowerShell) alike.
 * Blocks (exit 2, the reason goes back to the agent):
 *   - git commit / merge / cherry-pick / revert / am while the current branch is main
 *   - any git push that targets main, or a bare `git push` from main
 *   - force pushes and --no-verify
 *   - gh pr merge --admin (it skips the required CI check)
 * GitHub's ruleset on main enforces the same server side; this hook just stops the mistake earlier.
 */
import { execFileSync } from "node:child_process";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PROTECTED = "main";
const CD = ["cd", "chdir", "set-location", "sl", "push-location", "pushd"];

// split into simple commands on ; && || | and newlines, then tokenize each with quote handling
export function tokenize(segment) {
  const tokens = [];
  let current = "";
  let quote = null;
  let started = false;
  for (const ch of segment) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      started = true;
    } else if (/\s/.test(ch)) {
      if (started || current) tokens.push(current);
      current = "";
      started = false;
    } else {
      current += ch;
    }
  }
  if (started || current) tokens.push(current);
  return tokens;
}
function currentBranch(dir) {
  try {
    return execFileSync("git", ["-C", dir, "branch", "--show-current"], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

// returns why `command` must not run, or null; `branchOf(dir)` gives the checked-out branch
export function check(command, cwd, branchOf = currentBranch) {
  const segments = command
    .split(/&&|\|\||;|\||\n/)
    .map((s) => tokenize(s.trim()))
    .filter((t) => t.length);

  for (let tokens of segments) {
    // skip leading env assignments (FOO=bar git commit …) and PowerShell's call operator (& git …)
    while (tokens.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0]) || tokens[0] === "&")) {
      tokens = tokens.slice(1);
    }
    if (!tokens.length) continue;
    const bin = basename(tokens[0].replaceAll("\\", "/"))
      .toLowerCase()
      .replace(/\.exe$/, "");
    const rest = tokens.slice(1);

    // follow `cd <dir> && git …` (or Set-Location) so the branch check looks at the right repository
    if (CD.includes(bin)) {
      const target = rest.find((a) => !a.startsWith("-"));
      if (target) cwd = resolve(cwd, target.replace(/^~(?=$|[\\/])/, process.env.HOME ?? "~"));
      continue;
    }

    if (bin === "gh" && rest[0] === "pr" && rest[1] === "merge" && rest.includes("--admin")) {
      return "Blocked: `gh pr merge --admin` bypasses the required CI check on main.";
    }
    if (bin !== "git") continue;

    // git global options before the subcommand: -C <dir>, -c <key=value>, --flags
    let dir = cwd;
    let i = 0;
    while (i < rest.length && rest[i].startsWith("-")) {
      if (rest[i] === "-C") {
        dir = resolve(cwd, rest[i + 1] ?? ".");
        i += 2;
      } else if (rest[i] === "-c") i += 2;
      else i += 1;
    }
    const sub = rest[i];
    const args = rest.slice(i + 1);

    if (args.includes("--no-verify")) return "Blocked: --no-verify skips the repository's checks.";

    const branch = branchOf(dir);
    if (["commit", "merge", "cherry-pick", "revert", "am"].includes(sub) && branch === PROTECTED) {
      return `Blocked: \`git ${sub}\` on ${PROTECTED}.`;
    }

    if (sub === "push") {
      if (
        args.some(
          (a) => a === "-f" || a === "--force" || a.startsWith("--force-with-lease") || a.startsWith("+"),
        )
      ) {
        return "Blocked: force pushes are not allowed.";
      }
      const positional = args.filter((a) => !a.startsWith("-"));
      const refspecs = positional.slice(1); // first positional is the remote
      const targetsMain = refspecs.some((r) => {
        const dst = r.includes(":") ? r.split(":").pop() : r;
        return (
          dst === PROTECTED || dst === `refs/heads/${PROTECTED}` || (dst === "HEAD" && branch === PROTECTED)
        );
      });
      if (targetsMain || (refspecs.length === 0 && branch === PROTECTED)) {
        return `Blocked: pushing to ${PROTECTED}.`;
      }
    }
  }
  return null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0); // not something we understand: let the normal permission flow decide
  }
  // Copilot ignores matchers and runs this before every tool; only tools with a shell command matter
  const command = payload?.tool_input?.command;
  if (typeof command !== "string") process.exit(0);
  const reason = check(command, payload?.cwd ?? process.cwd());
  if (reason) {
    process.stderr.write(
      `${reason}\nWork on a feature branch instead: git switch main && git pull --ff-only && git switch -c feat/<milestone>-<slug>, ` +
        "then ship it with a PR (see .claude/skills/ship/SKILL.md). main only changes through PRs that pass CI.\n",
    );
    process.exit(2);
  }
  process.exit(0);
}
