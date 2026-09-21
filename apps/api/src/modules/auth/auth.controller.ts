import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { JWT_EXPIRES_IN, SESSION_COOKIE_NAME, SessionUser } from '@remedyo/shared';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDoctorDto, RegisterPatientDto } from './dto/auth.dto';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register/patient')
  async registerPatient(
    @Body() dto: RegisterPatientDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionUser> {
    const { token, user } = await this.auth.registerPatient(dto);
    this.setSessionCookie(res, token);
    return user;
  }

  @Public()
  @Post('register/doctor')
  async registerDoctor(
    @Body() dto: RegisterDoctorDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionUser> {
    const { token, user } = await this.auth.registerDoctor(dto);
    this.setSessionCookie(res, token);
    return user;
  }

  @Public()
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionUser> {
    const { token, user } = await this.auth.login(dto);
    this.setSessionCookie(res, token);
    return user;
  }

  @HttpCode(200)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<SessionUser> {
    return this.auth.currentUser(user);
  }

  /**
   * httpOnly so no script on the page can read the session, SameSite=Lax so it
   * is not sent on cross-site form posts. Lifetime is deliberately short:
   * design.md accepts that a JWT cannot be revoked server-side, and a two hour
   * window is the other half of that trade.
   */
  private setSessionCookie(res: Response, token: string): void {
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: TWO_HOURS_MS,
      path: '/',
    });
    void JWT_EXPIRES_IN;
  }
}
