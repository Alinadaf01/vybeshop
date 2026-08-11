export interface AuthUser {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  email: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface OtpVerifyResponse extends AuthTokens {
  user: AuthUser;
  isNewUser: boolean;
}

/** Response from exchanging a one-time admin-issued ticket for a real
 * session — access token only, no refresh: the support session simply dies
 * at its own expiry instead of being renewable. */
export interface ImpersonateConsumeResponse {
  access: string;
  user: AuthUser;
  expiresInSeconds: number;
}
