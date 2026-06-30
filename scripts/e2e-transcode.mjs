#!/usr/bin/env node
/**
 * E2E: register artist → create track → upload → confirm → wait READY → stream URL.
 *
 * Prerequisites:
 *   node scripts/setup-dev-env.mjs
 *   docker compose up -d (postgres, redis, minio, gateway, user-service, media-service, job-runner)
 *   DATABASE_URL=postgresql://sonoria:sonoria@localhost:5432/sonoria \
 *     pnpm --filter @sonoria/user-service exec prisma db push
 */
import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const GATEWAY = process.env.GATEWAY_URL ?? "http://localhost:3000";
const DOCKER_NETWORK = process.env.DOCKER_NETWORK ?? "sonoria_sonoria";
const POLL_MS = 2000;
const POLL_MAX = 45;

/** Presigned URLs target minio:9000 — upload/fetch from inside the compose network. */
function dockerCurl(args, body) {
  const tmpPath = join(tmpdir(), `e2e-${Date.now()}.bin`);
  if (body) writeFileSync(tmpPath, body);
  const mount = body ? `-v "${tmpPath.replace(/\\/g, "/")}:/data/file.bin:ro"` : "";
  const fileArg = body ? "--upload-file /data/file.bin" : "";
  try {
    execSync(
      `docker run --rm --network ${DOCKER_NETWORK} ${mount} curlimages/curl:8.5.0 -sS -f ${args} ${fileArg}`.trim(),
      { stdio: "pipe" },
    );
  } finally {
    if (body) unlinkSync(tmpPath);
  }
}

function uploadPresignedUrl(url, body, contentType) {
  dockerCurl(`-X PUT -H "Content-Type: ${contentType}" "${url}"`, body);
}

function verifyPresignedUrl(url) {
  dockerCurl(`-o /dev/null "${url}"`);
}

function createTestWav(durationSec = 1, sampleRate = 8000) {
  const numSamples = sampleRate * durationSec;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

async function request(method, path, { token, body } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${GATEWAY}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(
      `${method} ${path} → ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`,
    );
  }
  return data;
}

function promoteToArtist(email) {
  const sql = `UPDATE "User" SET role = 'ARTIST' WHERE email = '${email.replace(/'/g, "''")}';`;
  execSync("docker exec -i sonoria-postgres psql -U sonoria -d sonoria", {
    input: sql,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

async function waitForReady(trackId, token) {
  for (let i = 0; i < POLL_MAX; i++) {
    const track = await request("GET", `/tracks/${trackId}`, { token });
    console.log(`  poll ${i + 1}: status=${track.status}`);
    if (track.status === "READY") return track;
    if (track.status === "ERROR") {
      throw new Error(`Track entered ERROR state`);
    }
    await sleep(POLL_MS);
  }
  throw new Error(`Track not READY after ${(POLL_MS * POLL_MAX) / 1000}s`);
}

async function main() {
  const email = `e2e-${Date.now()}@sonoria.test`;
  const password = "TestPass123!";
  const filename = "e2e-test.wav";
  const wav = createTestWav();

  console.log("1. Health check gateway…");
  await request("GET", "/health");

  console.log("2. Register user…");
  const registered = await request("POST", "/auth/register", {
    body: { email, password, name: "E2E Artist" },
  });

  console.log("3. Promote to ARTIST (direct DB)…");
  promoteToArtist(email);

  console.log("4. Login…");
  const { access_token: token } = await request("POST", "/auth/login", {
    body: { email, password },
  });

  console.log("5. Create track…");
  const { trackId, uploadUrl } = await request("POST", "/tracks", {
    token,
    body: {
      title: "E2E Transcode Test",
      filename,
      mimeType: "audio/wav",
    },
  });
  console.log(`   trackId=${trackId}`);

  const s3Key = `tracks/${trackId}/original/${filename}`;

  console.log("6. Upload audio to presigned URL (via Docker network)…");
  uploadPresignedUrl(uploadUrl, wav, "audio/wav");

  console.log("7. Confirm upload (enqueue transcode)…");
  await request("POST", "/media/confirm-upload", {
    token,
    body: { trackId, s3Key },
  });

  console.log("8. Wait for transcode (READY)…");
  const track = await waitForReady(trackId, token);

  if (!track.streamUrl) {
    throw new Error("READY track missing streamUrl");
  }

  console.log("9. Verify stream URL (via Docker network)…");
  verifyPresignedUrl(track.streamUrl);

  console.log("\n✓ E2E transcode pipeline OK");
  console.log(`  trackId: ${trackId}`);
  console.log(`  status: ${track.status}`);
  console.log(`  waveform samples: ${Array.isArray(track.waveformJson) ? track.waveformJson.length : "n/a"}`);
}

main().catch((err) => {
  console.error("\n✗ E2E failed:", err.message ?? err);
  process.exit(1);
});
