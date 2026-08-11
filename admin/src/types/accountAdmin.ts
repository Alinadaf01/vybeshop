export interface ResetPasswordResponse {
  password: string;
}

export interface ImpersonateResponse {
  access: string;
  refresh: string;
  user: { id: string; phone: string; firstName: string; lastName: string };
}

export interface ForceLogoutResponse {
  tokensRevoked: number;
}
