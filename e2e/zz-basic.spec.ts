import { expect, test } from "@playwright/test";
import { notFound, signInAs } from "./helpers";

// The Site Lead limits someone to Explore Skills. Runs late, and lifts it again at the end.

test.describe.configure({ mode: "serial" });

test("a Basic person sees Explore Skills only", async ({ page }) => {
  await signInAs(page, "Jordan Kim");
  await page.goto("/site/people");
  await page.getByRole("button", { name: "Limit Ella Jensen to Explore Skills" }).click();
  await expect(page.getByText("Limited to Explore Skills.")).toBeVisible();

  await signInAs(page, "Ella Jensen");
  await expect(page.getByRole("link", { name: "Roles", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "My profile" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "My development plan" })).toHaveCount(0);
  for (const path of ["/roles", "/catalogue", "/explore", "/compare"]) {
    await page.goto(path);
    await expect(notFound(page), path).toHaveCount(0);
  }
  for (const path of [
    "/me",
    "/me/plan",
    "/onboarding",
    "/team",
    "/requests",
    "/site",
    "/practices/frontend",
  ]) {
    await page.goto(path);
    await expect(notFound(page), path).toBeVisible();
  }
});

test("the Site Lead lifts Basic", async ({ page }) => {
  await signInAs(page, "Jordan Kim");
  await page.goto("/site/people");
  await page.getByRole("button", { name: "Lift Basic from Ella Jensen" }).click();
  await expect(page.getByText("Basic lifted.")).toBeVisible();
  await signInAs(page, "Ella Jensen");
  await page.goto("/me");
  await expect(notFound(page)).toHaveCount(0);
});
