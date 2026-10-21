import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { Env } from '../../config/env';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { AuthService, SessionMeta } from './auth.service';
import { CookieSettings, REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from './auth.cookies';
import { ChangePasswordDto, DeleteAccountDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './auth.dto';
import { StorageService } from '../storage/storage.service';

const STRICT = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  private readonly cookies: CookieSettings;

  constructor(
    private readonly auth: AuthService,
    private readonly storage: StorageService,
    config: ConfigService<Env, true>,
  ) {
    this.cookies = {
      secure: config.get('NODE_ENV', { infer: true }) === 'production',
      domain: config.get('COOKIE_DOMAIN', { infer: true }),
      accessTtlSeconds: config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }),
      refreshTtlDays: config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }),
    };
  }

  @Public() @Throttle(STRICT) @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const s = await this.auth.register(dto, meta(req));
    setAuthCookies(res, this.cookies, s.accessToken, s.refreshToken);
    return { user: s.user };
  }

  @Public() @Throttle(STRICT) @HttpCode(200) @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const s = await this.auth.login(dto, meta(req));
    setAuthCookies(res, this.cookies, s.accessToken, s.refreshToken);
    return { user: s.user };
  }

  @Public() @HttpCode(200) @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const s = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE], meta(req));
      setAuthCookies(res, this.cookies, s.accessToken, s.refreshToken);
      return { user: s.user };
    } catch (e) {
      clearAuthCookies(res, this.cookies);
      throw e;
    }
  }

  @Public() @HttpCode(204) @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(res, this.cookies);
  }

  @Public() @Throttle(STRICT) @HttpCode(202) @Post('forgot-password')
  async forgot(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { message: 'If an account exists for that email, a reset link is on its way.' };
  }

  @Public() @Throttle(STRICT) @HttpCode(204) @Post('reset-password')
  async reset(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
  }

  // These live under /auth so the refresh cookie (path /api/v1/auth) is sent with them.
  @Throttle(STRICT) @HttpCode(204) @Post('change-password')
  async changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword, req.cookies?.[REFRESH_COOKIE]);
  }

  @Throttle(STRICT) @HttpCode(204) @Post('delete-account')
  async deleteAccount(@Body() dto: DeleteAccountDto, @CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.deleteAccount(user.id, dto.password, (paths) => this.storage.removePrivate(paths));
    clearAuthCookies(res, this.cookies);
  }

  @Get('session')
  session(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id).then((u) => ({ user: u }));
  }
}

const meta = (req: Request): SessionMeta => ({ userAgent: req.header('user-agent'), ip: req.ip });
