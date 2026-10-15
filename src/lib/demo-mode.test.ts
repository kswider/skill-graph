import { describe, expect, it } from "vitest";
import { defaultDemoEmailFor, isDemoDeployment } from "./demo-mode";

describe("default demo person", () => {
  const sky = { DEFAULT_DEMO_EMAIL: " Sky.Bennett@example.com " };
  it("is the trimmed, lower-cased address where demo sign-in is on", () => {
    expect(defaultDemoEmailFor(sky)).toBe("sky.bennett@example.com");
    expect(defaultDemoEmailFor({ ...sky, VERCEL_ENV: "preview" })).toBe("sky.bennett@example.com");
  });
  it("is off when unset or empty", () => {
    expect(defaultDemoEmailFor({})).toBeNull();
    expect(defaultDemoEmailFor({ DEFAULT_DEMO_EMAIL: "" })).toBeNull();
  });
  it("is off on production unless demo sign-in is on and a secret is set", () => {
    expect(defaultDemoEmailFor({ ...sky, VERCEL_ENV: "production" })).toBeNull();
    const demo = { ...sky, VERCEL_ENV: "production", ENABLE_DEMO_SIGN_IN: "true" };
    expect(defaultDemoEmailFor(demo)).toBeNull();
    expect(defaultDemoEmailFor({ ...demo, BETTER_AUTH_SECRET: "s" })).toBe("sky.bennett@example.com");
  });
});

describe("demo deployment", () => {
  it("is on locally and on previews", () => {
    expect(isDemoDeployment({})).toBe(true);
    expect(isDemoDeployment({ VERCEL_ENV: "preview" })).toBe(true);
    expect(isDemoDeployment({ VERCEL_ENV: "development" })).toBe(true);
  });
  it("is off on production unless the owner turns it on", () => {
    expect(isDemoDeployment({ VERCEL_ENV: "production" })).toBe(false);
    expect(isDemoDeployment({ VERCEL_ENV: "production", ENABLE_DEMO_SIGN_IN: "false" })).toBe(false);
    expect(isDemoDeployment({ VERCEL_ENV: "production", ENABLE_DEMO_SIGN_IN: "1" })).toBe(false);
    expect(isDemoDeployment({ VERCEL_ENV: "production", ENABLE_DEMO_SIGN_IN: "true" })).toBe(true);
  });
});
