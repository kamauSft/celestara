import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("rejects an unknown number", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Phone").fill("0799000111");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("login-error")).toHaveText(
    "This number isn't registered. Ask your treasurer to add you.",
  );
  await expect(page).toHaveURL(/\/login/);
});

test("shows how many PIN tries are left", async ({ page }) => {
  await page.goto("/login?who=member");
  await page.getByRole("button", { name: "Use a PIN instead" }).click();
  await page.getByLabel("PIN").fill("0000");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId("login-error")).toHaveText("Wrong PIN. 4 tries left.");
});

test("signs a member in with a text code and keeps the treasurer pages closed", async ({ page }) => {
  await page.goto("/login?who=member");
  await page.getByRole("button", { name: "Continue" }).click();
  const demo = page.getByTestId("demo-code");
  await expect(page.getByTestId("demo-banner")).toBeVisible();
  await page.getByLabel("SMS code").fill((await demo.innerText()).trim());
  await page.getByRole("button", { name: "Confirm code" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Amina");
  await expect(page.getByRole("heading", { name: "Set a 4-digit PIN" })).toBeVisible();

  await page.goto("/desk");
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/members");
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/members/M006");
  await expect(page).toHaveURL(/\/home$/);
});

test("signs the treasurer in after the PIN and the SMS code", async ({ page }) => {
  await page.goto("/login?who=treasurer");
  await expect(page.getByLabel("PIN")).toHaveValue("2580");
  await page.getByRole("button", { name: "Continue" }).click();
  const demo = page.getByTestId("demo-code");
  await expect(demo).toBeVisible();
  await page.getByLabel("SMS code").fill((await demo.innerText()).trim());
  await page.getByRole("button", { name: "Confirm code" }).click();
  await expect(page).toHaveURL(/\/desk$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("meeting");
});
