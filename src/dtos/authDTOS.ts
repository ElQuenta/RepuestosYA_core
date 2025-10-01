export interface RegisterEnterpriseAccountDTO {
  username: string;
  email: string;
  password: string;
  cellphone: string;
  nit: string;
  address: string;
  representant: string;
  representantCi: string;
  roles: number[];
  description: string;
  links: RegisterExternalLinks[];
}

export interface RegisterExternalLinks {
  name: string;
  link: string;
}

export interface RegisterAccountDTO {
  username: string;
  email: string;
  password: string;
  cellphone: string;
  roles: number[];
}

export interface Role {
  role: string;
  role_id: number;
}

export interface User {
  id: number;
  email: string;
  roles: Role[];
  username: string;
  cellphone_num: string;
  password?: string;
}

export interface Representant {
  ci: string;
  name: string;
}

export interface ExternalLink {
  url: string;
  name: string;
  link_id: number;
}

export interface Enterprise {
  id: number;
  nit: string;
  address: string;
  enabled: boolean;
  description: string;
  representant: Representant;
  external_links: ExternalLink[];
}

export interface RegisterEnterpriseResult {
  user: User;
  enterprise: Enterprise;
}

export interface RegisterAccountResult {
  user: User;
}

export interface getAccountResult {
  user: User;
  enterprise?: Enterprise;
}

export interface LoginResult {
  token: string;
  user: User;
  enterprise?: Enterprise;
}