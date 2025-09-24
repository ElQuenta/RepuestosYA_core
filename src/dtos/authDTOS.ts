export interface Account {
  id: number;
  username: string;
  email: string;
  password: string;
  cellphone_num: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Role {
  id: number;
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ExternalLink {
  id: number;
  name: string;
  link: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface EnterpriseAccount {
  id: number;
  NIT: string;
  address: string;
  description?: string | null;
  representant: string;
  representant_CI: string;
  enabled: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface EnterprisePayload {
  enterprise: EnterpriseAccount | null;
  external_links: ExternalLink[];
}

export interface FullUserResponse {
  account: Account;
  roles: Role[];
  enterprise_account: EnterprisePayload | null;
}

export interface CreateEnterpriseWithAccountParams {
  username: string;
  email: string;
  password: string;
  cellphone_num: string;
  roles?: number[];
  NIT: string;
  address: string;
  representant: string;
  representant_CI: string;
  description?: string;
  links?: { name: string; link: string }[];
}

export interface CreateAccountWithRolesParams {
  username: string;
  email: string;
  password: string;
  cellphone_num: string;
  roles?: number[];
}