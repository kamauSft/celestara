import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("rejects an unknown number with the chama name", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Phone").fill("0799000111");
  await page.getByLabel("PIN").fill("2580");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("login-error")).toHaveText(
    "We couldn't find that number in Umoja Savings Group.",
  );
  await expect(page).toHaveURL(/\/login/);
});

test("shows how many PIN tries are left", async ({ page }) => {
  await page.goto("/login?who=member");
  await page.getByLabel("PIN").fill("0000");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("login-error")).toHaveText("Wrong PIN. 4 tries left.");
});

test("signs a member in and keeps the treasurer's pages closed", async ({ page }) => {
  await page.goto("/login?who=member");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Amina");

  await page.goto("/desk");
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/members");
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/members/M006");
  await expect(page).toHaveURL(/\/home$/);
});

test("signs the treasurer in after the SMS code", async ({ page }) => {
  await page.goto("/login?who=treasurer");
  await page.getByRole("button", { name: "Continue" }).click();
  const demo = page.getByTestId("demo-code");
  await expect(demo).toBeVisible();
  await page.getByLabel("SMS code").fill((await demo.innerText()).trim());
  await page.getByRole("button", { name: "Confirm code" }).click();
  await expect(page).toHaveURL(/\/desk$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("meeting");
});
