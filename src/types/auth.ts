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
