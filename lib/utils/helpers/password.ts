import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derivedKey}`;
};

export const verifyPassword = (password: string, storedHash: string): boolean => {
  const [salt, derivedKey] = storedHash.split(":");
  if (!salt || !derivedKey) {
    return false;
  }

  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const stored = Buffer.from(derivedKey, "hex");
  if (candidate.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(candidate, stored);
};
