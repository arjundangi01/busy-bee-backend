import httpStatus from "http-status";
import { AuthProvider } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { isNonEmptyString } from "@/utils/helpers/common";
import { hashPassword, verifyPassword } from "@/utils/helpers/password";
import { createSessionToken } from "@/utils/helpers/sessionToken";
import { verifyGoogleIdToken } from "@/utils/helpers/firebaseAdmin";
import {
  IAuthResult,
  IAuthUser,
  IGoogleAuthPayload,
  ISignInPayload,
  ISignUpPayload,
  IUpdatePreferencesPayload,
} from "@/routes/auth/utils/types";

const MIN_PASSWORD_LENGTH = 8;

export class AuthHelpers {
  public static signUp = async (
    payload: ISignUpPayload,
  ): Promise<IAuthResult> => {
    AuthHelpers.validateSignUp(payload);

    const email = payload.email.trim().toLowerCase();
    const existingUser = await prismaClient.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new AppError(
        "An account with this email already exists",
        httpStatus.CONFLICT,
      );
    }

    const user = await prismaClient.user.create({
      data: {
        name: payload.name.trim(),
        email,
        passwordHash: hashPassword(payload.password),
        backgroundExecutionGranted: payload.backgroundExecutionGranted ?? null,
        notificationsGranted: payload.notificationsGranted ?? null,
      },
    });

    return AuthHelpers.buildAuthResult(user);
  };

  public static signIn = async (
    payload: ISignInPayload,
  ): Promise<IAuthResult> => {
    if (
      !isNonEmptyString(payload.email) ||
      !isNonEmptyString(payload.password)
    ) {
      throw new AppError(
        "Email and password are required",
        httpStatus.BAD_REQUEST,
      );
    }

    const user = await prismaClient.user.findUnique({
      where: { email: payload.email.trim().toLowerCase() },
    });

    if (!user) {
      throw new AppError("Invalid email or password", httpStatus.UNAUTHORIZED);
    }
    if (!user.passwordHash) {
      throw new AppError(
        "This account uses Google sign-in — continue with Google instead",
        httpStatus.BAD_REQUEST,
      );
    }
    if (!verifyPassword(payload.password, user.passwordHash)) {
      throw new AppError("Invalid email or password", httpStatus.UNAUTHORIZED);
    }

    return AuthHelpers.buildAuthResult(user);
  };

  public static signInWithGoogle = async (payload: IGoogleAuthPayload): Promise<IAuthResult> => {
    if (!isNonEmptyString(payload.idToken)) {
      throw new AppError("A Google sign-in token is required", httpStatus.BAD_REQUEST);
    }

    const googleUser = await verifyGoogleIdToken(payload.idToken);

    const existingByFirebaseUid = await prismaClient.user.findUnique({
      where: { firebaseUid: googleUser.uid },
    });
    if (existingByFirebaseUid) {
      return AuthHelpers.buildAuthResult(existingByFirebaseUid);
    }

    const email = googleUser.email.trim().toLowerCase();
    const existingByEmail = await prismaClient.user.findUnique({ where: { email } });
    if (existingByEmail) {
      // Only auto-link a verified Google email to an existing account — an
      // unverified email claim can't be trusted to prove ownership.
      if (!googleUser.emailVerified) {
        throw new AppError(
          "An account with this email already exists — sign in with your password instead",
          httpStatus.CONFLICT,
        );
      }
      const linked = await prismaClient.user.update({
        where: { id: existingByEmail.id },
        data: { firebaseUid: googleUser.uid },
      });
      return AuthHelpers.buildAuthResult(linked);
    }

    const created = await prismaClient.user.create({
      data: {
        name: googleUser.name?.trim() || email.split("@")[0],
        email,
        passwordHash: null,
        authProvider: AuthProvider.GOOGLE,
        firebaseUid: googleUser.uid,
        backgroundExecutionGranted: payload.backgroundExecutionGranted ?? null,
        notificationsGranted: payload.notificationsGranted ?? null,
      },
    });
    return AuthHelpers.buildAuthResult(created);
  };

  public static getMe = async (userId: string): Promise<IAuthResult> => {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", httpStatus.NOT_FOUND);
    }

    return AuthHelpers.buildAuthResult(user);
  };

  public static updatePreferences = async (
    userId: string,
    payload: IUpdatePreferencesPayload,
  ): Promise<IAuthResult> => {
    const user = await prismaClient.user.update({
      where: { id: userId },
      data: {
        pushNotificationsEnabled: payload.pushNotificationsEnabled,
        eodNudgeEnabled: payload.eodNudgeEnabled,
      },
    });

    return AuthHelpers.buildAuthResult(user);
  };

  private static validateSignUp = (payload: ISignUpPayload): void => {
    if (!isNonEmptyString(payload.name)) {
      throw new AppError("Name is required", httpStatus.BAD_REQUEST);
    }
    if (!isNonEmptyString(payload.email) || !payload.email.includes("@")) {
      throw new AppError("A valid email is required", httpStatus.BAD_REQUEST);
    }
    if (
      !isNonEmptyString(payload.password) ||
      payload.password.length < MIN_PASSWORD_LENGTH
    ) {
      throw new AppError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        httpStatus.BAD_REQUEST,
      );
    }
  };

  private static buildAuthResult = (user: IAuthUser): IAuthResult => {
    const token = createSessionToken({ userId: user.id, issuedAt: Date.now() });
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        backgroundExecutionGranted: user.backgroundExecutionGranted,
        notificationsGranted: user.notificationsGranted,
        pushNotificationsEnabled: user.pushNotificationsEnabled,
        eodNudgeEnabled: user.eodNudgeEnabled,
      },
      token,
    };
  };
}
