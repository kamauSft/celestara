import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default function setup() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  execSync("npx prisma generate && npx prisma db push --skip-generate --accept-data-loss", {
    cwd: root,
    env: { ...process.env, DATABASE_URL: "file:./prisma/test.db" },
    stdio: "inherit",
  });
}
