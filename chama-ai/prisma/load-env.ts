import { existsSync, readFileSync } from "node:fs";

const path = new URL("../.env", import.meta.url);
if (existsSync(path)) {
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}
