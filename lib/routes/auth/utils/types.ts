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

export type IGoogleAuthPayload = {
  idToken: string;
  // Only used the first time this Firebase account creates a new User —
  // matches ISignUpPayload's own permission fields.
  backgroundExecutionGranted?: boolean;
  notificationsGranted?: boolean;
};

export type IAuthUser = {
  id: string;
  name: string;
  email: string;
  backgroundExecutionGranted: boolean | null;
  notificationsGranted: boolean | null;
  pushNotificationsEnabled: boolean;
  eodNudgeEnabled: boolean;
};

export type IAuthResult = {
  user: IAuthUser;
  token: string;
};

export type IUpdatePreferencesPayload = {
  pushNotificationsEnabled?: boolean;
  eodNudgeEnabled?: boolean;
};
