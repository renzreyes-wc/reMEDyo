import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { SESSION_COOKIE_NAME } from '@remedyo/shared';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../prisma.service';
import type { AuthUser, JwtPayload } from '../types';

/**
 * Verifies the session cookie and loads the account.
 *
 * The account row is re-read on every request rather than trusted from the
 * token. That costs one indexed lookup and buys the thing a stateless JWT
 * cannot do on its own: an administrator suspending an account takes effect on
 * that user's very next request, even though their token is still signed and
 * unexpired. design.md names this as the mitigation for having no server-side
 * revocation.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = request.cookies?.[SESSION_COOKIE_NAME] as string | undefined;

    if (!token) {
      throw new UnauthorizedException('You need to sign in to do that.');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      throw new UnauthorizedException('Your session is no longer valid.');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'This account is not active. Please contact the administrator.',
      );
    }

    request.user = user;
    return true;
  }
}
