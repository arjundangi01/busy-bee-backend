export type IBlockedAppDto = {
  id: string;
  packageName: string;
  appName: string;
  createdAt: string;
};

export type IAddBlockedAppPayload = {
  packageName: string;
  appName: string;
};

export type ISeedBlocklistDefaultsPayload = IAddBlockedAppPayload[];
