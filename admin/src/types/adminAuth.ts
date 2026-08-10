export interface AdminUser {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  isStaff: boolean;
}

export interface AdminTokens {
  access: string;
  refresh: string;
}

export interface AdminLoginResponse {
  access: string;
  refresh: string;
  user: AdminUser;
}
