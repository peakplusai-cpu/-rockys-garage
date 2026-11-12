import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { MAX_PASSWORD_LENGTH } from "./guards";

export function hashPassword(password: string): string {
  if (!password || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error("password length");
  }
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!password || password.length > MAX_PASSWORD_LENGTH) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== test.length) return false;
  return timingSafeEqual(test, expected);
}
