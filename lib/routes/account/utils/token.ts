import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/utils/configuration/env";

export type IDeletionTokenPayload = {
  userId: string;
  expiresAt: number;
};

// 45 minutes — inside the spec's 30-60 min window.
const DELETION_TOKEN_TTL_MS = 45 * 60 * 1000;

// Stateless, HMAC-signed — same shape as sessionToken.ts, with an expiry
// baked into the payload (session tokens don't expire; these must). No DB
// row is needed to track "used": deletion is a hard delete, so a token
// reused after its account is gone fails verifyDeletionToken's user lookup
// in account/helpers.ts for free. Signed material is namespaced ("deletion:")
// so a valid deletion token can never be replayed as a session token or
// vice versa, even though sessionTokenSecret is shared.
const sign = (encodedPayload: string): string =>
  createHmac("sha256", env.sessionTokenSecret).update(`deletion:${encodedPayload}`).digest("base64url");

export const createDeletionToken = (userId: string): string => {
  const payload: IDeletionTokenPayload = { userId, expiresAt: Date.now() + DELETION_TOKEN_TTL_MS };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export const verifyDeletionToken = (token: string): IDeletionTokenPayload | null => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as IDeletionTokenPayload;
    if (typeof payload.userId !== "string" || typeof payload.expiresAt !== "number") {
      return null;
    }
    if (Date.now() > payload.expiresAt) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};
