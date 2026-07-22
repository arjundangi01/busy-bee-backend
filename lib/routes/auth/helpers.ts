import httpStatus from "http-status";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { isNonEmptyString } from "@/utils/helpers/common";
import { hashPassword, verifyPassword } from "@/utils/helpers/password";
import { createSessionToken } from "@/utils/helpers/sessionToken";
import {
  IAuthResult,
  IAuthUser,
  ISignInPayload,
  ISignUpPayload,
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

    if (!user || !verifyPassword(payload.password, user.passwordHash)) {
      throw new AppError("Invalid email or password", httpStatus.UNAUTHORIZED);
    }

    return AuthHelpers.buildAuthResult(user);
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
      user: { id: user.id, name: user.name, email: user.email },
      token,
    };
  };
}
