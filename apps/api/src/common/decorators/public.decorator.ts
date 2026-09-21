import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route out of the globally applied auth guard.
 *
 * Authentication is on by default: a new controller is protected unless its
 * author says otherwise, which is the safer direction for a health product.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
