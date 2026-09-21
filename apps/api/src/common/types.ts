import type { AccountStatus, Role } from '@prisma/client';

/** What the guard attaches to the request once a session is verified. */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  status: AccountStatus;
}

export interface JwtPayload {
  sub: string;
  role: Role;
}
