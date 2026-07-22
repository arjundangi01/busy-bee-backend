export type ISignUpPayload = {
  name: string;
  email: string;
  password: string;
  // Captured during 3.1 Onboarding, submitted here since no User record
  // exists yet at that point.
  backgroundExecutionGranted?: boolean;
  notificationsGranted?: boolean;
};

export type ISignInPayload = {
  email: string;
  password: string;
};

export type IAuthUser = {
  id: string;
  name: string;
  email: string;
};

export type IAuthResult = {
  user: IAuthUser;
  token: string;
};
