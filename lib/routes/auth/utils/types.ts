export type ISignUpPayload = {
  name: string;
  email: string;
  password: string;
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
