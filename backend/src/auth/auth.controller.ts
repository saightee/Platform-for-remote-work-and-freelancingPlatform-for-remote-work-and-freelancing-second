import { Controller, Post, Body, Headers, UnauthorizedException, Get, UseGuards, Request, Res, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  async logout(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const isBlacklisted = await this.authService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token already invalidated');
    }
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;
    return this.authService.logout(userId);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Request() req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Request() req,
    @Res() res: Response,
    @Query('role') role: 'employer' | 'jobseeker',
    @Query('callbackUrl') callbackUrl: string,
  ) {
    console.log('Google Callback - req.user:', req.user);
    try {
      // Сохраняем данные пользователя в Redis и получаем tempToken
      const tempToken = await this.authService.storeOAuthUserData(req.user, role || 'jobseeker');
      console.log('Google Callback - Temp Token:', tempToken);

      // Завершаем регистрацию и получаем accessToken
      const user = await this.authService.completeRegistration(tempToken, role || 'jobseeker', {
        timezone: 'UTC',
        currency: 'USD',
      });

      // Формируем URL для редиректа на фронтенд
      const redirectUrl = callbackUrl || `${req.protocol}://${req.get('host')}/auth/callback`;
      const redirectParams = new URLSearchParams({
        token: user.accessToken,
        role: role || 'jobseeker',
      }).toString();

      // Перенаправляем на фронтенд с параметрами
      return res.redirect(`${redirectUrl}?${redirectParams}`);
    } catch (error) {
      console.error('Google Callback - Error:', error);
      return res.status(500).json({ message: 'Authentication failed', error: error.message });
    }
  }

  @Post('test-register')
  async testRegister(
    @Body() body: { email: string; password: string; username: string; role: 'employer' | 'jobseeker' },
    @Res() res: Response,
  ) {
    const registerDto = { email: body.email, password: body.password, username: body.username, role: body.role };
    const user = await this.authService.register(registerDto);
    return res.json(user);
  }
}