import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/utils/configuration/env";

export type ISessionTokenPayload = {
  userId: string;
  issuedAt: number;
};

const sign = (encodedPayload: string): string =>
  createHmac("sha256", env.sessionTokenSecret).update(encodedPayload).digest("base64url");

export const createSessionToken = (payload: ISessionTokenPayload): string => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export const verifySessionToken = (token: string): ISessionTokenPayload | null => {
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
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as ISessionTokenPayload;
  } catch {
    return null;
  }
};
