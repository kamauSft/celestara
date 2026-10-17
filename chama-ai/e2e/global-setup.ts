import { execFileSync } from "node:child_process";
import path from "node:path";

export default function globalSetup() {
  const tsx = path.resolve("node_modules/.bin/tsx");
  execFileSync(tsx, ["scripts/reset-lockout.ts"], { stdio: "inherit" });
}
