#!/usr/bin/env node
// Generates JWT keys and writes per-app .env files from .env.example templates.
// Safe to re-run — overwrites .env files (never committed).
import { generateKeyPairSync } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function generateJwtKeys() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  return {
    privateKey: Buffer.from(
      privateKey.export({ type: "pkcs1", format: "pem" }),
    ).toString("base64"),
    publicKey: Buffer.from(
      publicKey.export({ type: "pkcs1", format: "pem" }),
    ).toString("base64"),
  };
}

function writeEnv(app, replacements) {
  const examplePath = join(root, "apps", app, ".env.example");
  if (!existsSync(examplePath)) {
    console.warn(`skip ${app}: no .env.example`);
    return;
  }
  let content = readFileSync(examplePath, "utf8");
  for (const [key, value] of Object.entries(replacements)) {
    const line = new RegExp(`^${key}=.*$`, "m");
    if (line.test(content)) {
      content = content.replace(line, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }
  const outPath = join(root, "apps", app, ".env");
  writeFileSync(outPath, content.trim() + "\n");
  console.log(`wrote ${outPath}`);
}

const { privateKey, publicKey } = generateJwtKeys();

writeEnv("gateway", { JWT_PUBLIC_KEY: publicKey });
writeEnv("user-service", {
  JWT_PRIVATE_KEY: privateKey,
  JWT_PUBLIC_KEY: publicKey,
});
writeEnv("media-service", {});
writeEnv("social-service", {});
writeEnv("playlist-service", {});
writeEnv("job-runner", {});

// front optional for e2e transcode
const frontExample = join(root, "apps", "front", ".env.example");
if (existsSync(frontExample)) {
  writeEnv("front", {});
} else {
  writeFileSync(
    join(root, "apps", "front", ".env"),
    "NEXT_PUBLIC_API_URL=http://localhost:3010\n",
  );
  console.log("wrote apps/front/.env (minimal)");
}

console.log("Dev .env files ready.");
