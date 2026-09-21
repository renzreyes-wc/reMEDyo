import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Coarse role gate. Ownership checks live in services, next to the query. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
