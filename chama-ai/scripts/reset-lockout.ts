import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

async function main() {
  const phone = process.argv[2];
  const { resetLoginLockouts } = await import("../lib/auth/lockout");
  const { prismaRaw } = await import("../lib/db");
  try {
    const count = await resetLoginLockouts(phone);
    console.log(phone ? `Cleared the lockout for ${count} person.` : `Cleared lockouts for ${count} people.`);
  } finally {
    await prismaRaw.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
