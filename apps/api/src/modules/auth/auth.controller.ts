import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JWT_EXPIRES_IN, SESSION_COOKIE_NAME, SessionUser } from '@remedyo/shared';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/types';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDoctorDto, RegisterPatientDto } from './dto/auth.dto';
import { LogoutResponseDto, SessionUserDto } from './dto/auth.response';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @ApiOperation({
    summary: 'Register a patient',
    description: 'Creates the account, signs it in, and sets the session cookie.',
  })
  @ApiCreatedResponse({ description: 'The new patient account.', type: SessionUserDto })
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
  @ApiOperation({
    summary: 'Register a doctor',
    description:
      'Creates the account and signs it in. The profile starts awaiting administrator approval.',
  })
  @ApiCreatedResponse({
    description: 'The new doctor account, with approval awaiting review.',
    type: SessionUserDto,
  })
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
  @ApiOperation({
    summary: 'Sign in',
    description: 'Sets the session cookie and returns the signed-in account.',
  })
  @ApiOkResponse({ description: 'The signed-in account.', type: SessionUserDto })
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

  @ApiOperation({
    summary: 'Sign out',
    description: 'Clears the session cookie. Succeeds whether or not a session was present.',
  })
  @ApiOkResponse({ description: 'The cookie was cleared.', type: LogoutResponseDto })
  @HttpCode(200)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    // The attributes must match the ones the cookie was set with, or the
    // browser treats this as a different cookie and leaves the session in
    // place — see setSessionCookie below for why they vary by deployment.
    const crossSite = process.env.CROSS_SITE_COOKIE === 'true';

    res.clearCookie(SESSION_COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      sameSite: crossSite ? 'none' : 'lax',
      secure: crossSite || process.env.NODE_ENV === 'production',
    });
    return { ok: true };
  }

  @ApiOperation({
    summary: 'The signed-in account',
    description: 'Reads the account from the session cookie. Re-read on every request.',
  })
  @ApiOkResponse({ description: 'The signed-in account.', type: SessionUserDto })
  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<SessionUser> {
    return this.auth.currentUser(user);
  }

  /**
   * httpOnly so no script on the page can read the session. Lifetime is
   * deliberately short: design.md accepts that a JWT cannot be revoked
   * server-side, and a two hour window is the other half of that trade.
   *
   * SameSite is Lax by default, which is the stronger posture: the cookie is
   * not sent on cross-site requests at all. That holds wherever the web app
   * and the api share a site — locally both are localhost, and ports do not
   * make a site.
   *
   * It does NOT hold when they are deployed as separate hosts. On Fly the web
   * app is remedyo-web.fly.dev and the api is remedyo-api.fly.dev, and since
   * fly.dev is on the Public Suffix List those are two different *sites*, not
   * sibling subdomains. A Lax cookie from that cross-site fetch is discarded
   * by the browser, so every login silently succeeds and then appears to fail.
   * Cross-site delivery requires SameSite=None, which requires Secure.
   *
   * Set CROSS_SITE_COOKIE=true only for that deployment shape. The cost is
   * that the cookie now rides along on cross-site requests, so CSRF no longer
   * has SameSite as a backstop; what remains is the single allowed CORS origin
   * and the fact that every mutating route requires a JSON body, which forces
   * a preflight a foreign origin cannot pass. Serving both behind one hostname
   * would remove the trade-off entirely and is the better long-term fix.
   */
  private setSessionCookie(res: Response, token: string): void {
    const crossSite = process.env.CROSS_SITE_COOKIE === 'true';

    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: crossSite ? 'none' : 'lax',
      // SameSite=None is only valid on a Secure cookie.
      secure: crossSite || process.env.NODE_ENV === 'production',
      maxAge: TWO_HOURS_MS,
      path: '/',
    });
    void JWT_EXPIRES_IN;
  }
}
