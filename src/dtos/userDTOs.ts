export interface UpdateAccountDTO {
  id: number;
  username?: string;
  email?: string;
  password?: string;
  cellphone?: string;
}

export interface UpdateEnterpriseDTO {
  id: number;
  enabled?: boolean;
  nit?: string;
  address?: string;
  description?: string;
  representant?: string;
  representantCi?: string;
  accountId?: number;
}