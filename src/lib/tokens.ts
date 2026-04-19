import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function randomTokenHex(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function verifyTokenHash(token: string, hash: string) {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
