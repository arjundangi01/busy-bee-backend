import httpStatus from "http-status";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { env } from "@/utils/configuration/env";
import { AppError } from "@/utils/helpers/appError";

export type IVerifiedGoogleUser = {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

const getFirebaseApp = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  if (!env.firebaseServiceAccountJson) {
    throw new AppError("Google sign-in isn't configured yet", httpStatus.NOT_IMPLEMENTED);
  }

  let serviceAccount: object;
  try {
    serviceAccount = JSON.parse(env.firebaseServiceAccountJson);
  } catch {
    throw new AppError(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON",
      httpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  return initializeApp({ credential: cert(serviceAccount) });
};

export const verifyGoogleIdToken = async (idToken: string): Promise<IVerifiedGoogleUser> => {
  const app = getFirebaseApp();

  let decoded;
  try {
    decoded = await getAuth(app).verifyIdToken(idToken);
  } catch {
    throw new AppError("Invalid or expired Google sign-in token", httpStatus.UNAUTHORIZED);
  }

  if (!decoded.email) {
    throw new AppError("Google account has no email", httpStatus.BAD_REQUEST);
  }

  return {
    uid: decoded.uid,
    email: decoded.email,
    emailVerified: decoded.email_verified ?? false,
    name: (decoded.name as string | undefined) ?? null,
  };
};
