export const USER_ROLES = ["USER", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  userId: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterUserRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface LoginUserRequest {
  email: string;
  password: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
}
