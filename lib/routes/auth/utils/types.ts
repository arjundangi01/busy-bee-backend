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
  occupation: string | null;
  phone: string | null;
  age: number | null;
  bio: string | null;
  blocklistDefaultsSeeded: boolean;
  selectedWorkTypeId: string | null;
  accessibilityPrimingShown: boolean;
};

export type IAuthResult = {
  user: IAuthUser;
  token: string;
};

export type IUpdatePreferencesPayload = {
  pushNotificationsEnabled?: boolean;
  eodNudgeEnabled?: boolean;
  // DD-004 My Account — self-service profile edits, same endpoint.
  name?: string;
  occupation?: string;
  phone?: string;
  age?: number;
  bio?: string;
  // Bee's Hive — see design-artifacts/evolution/specs/05-bees-hive.md.
  // Validated (exists, active, Pro-gated) by WorkTypeHelpers.assertSelectable
  // before being persisted, same as every other field here is validated
  // before its own update.
  selectedWorkTypeId?: string;
  // See design-artifacts/evolution/specs/06-permission-priming.md — set once,
  // true, the first time the nudge screen is shown; never unset.
  accessibilityPrimingShown?: boolean;
};
