import { Controller, Post, Body, Headers, UnauthorizedException, Get, UseGuards, Request, Res, Query, Req, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private usersService: UsersService,
    private redisService: RedisService,
  ) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Headers('x-forwarded-for') xForwardedFor?: string,
    @Headers('x-real-ip') xRealIp?: string,
    @Headers('x-fingerprint') fingerprint?: string,
    @Req() req?: any,
  ) {
    const ipHeader = xForwardedFor || xRealIp || req?.socket?.remoteAddress || '127.0.0.1';
    const ip = ipHeader.split(',')[0].trim();
    console.log('Client IP:', ip);
    if (!fingerprint) {
      throw new BadRequestException('Fingerprint is required');
    }
    return this.authService.register(registerDto, ip, fingerprint);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google-login')
  async googleLogin(@Body('token') token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findByEmail(payload.email);
      if (!user || user.provider !== 'google') {
        throw new UnauthorizedException('Invalid credentials');
      }

      const newPayload = { email: user.email, sub: user.id, role: user.role };
      const newToken = this.jwtService.sign(newPayload, { expiresIn: '1h' });
      await this.redisService.set(`token:${user.id}`, newToken, 3600);

      return { accessToken: newToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
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
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // GoogleAuthGuard перенаправляет на Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Request() req,
    @Res() res: Response,
    @Query('callbackUrl') callbackUrl: string,
  ) {
    console.log('Google Callback - req.user:', req.user);
    try {
      const tempToken = await this.authService.storeOAuthUserData(req.user);
      console.log('Google Callback - Temp Token:', tempToken);

      const user = await this.authService.completeRegistration(tempToken, req.user.role, {
        timezone: 'UTC',
        currency: 'USD',
      });

      const redirectUrl = callbackUrl || `${req.protocol}://${req.get('host')}/auth/callback`;
      const redirectParams = new URLSearchParams({
        token: user.accessToken,
        role: req.user.role,
      }).toString();

      return res.redirect(`${redirectUrl}?${redirectParams}`);
    } catch (error) {
      console.error('Google Callback - Error:', error);
      return res.status(500).json({ message: 'Authentication failed', error: error.message });
    }
  }

  @Post('create-admin')
  async createAdmin(
    @Body() createAdminDto: CreateAdminDto,
    @Headers('x-forwarded-for') xForwardedFor?: string,
    @Headers('x-real-ip') xRealIp?: string,
    @Headers('x-fingerprint') fingerprint?: string,
    @Req() req?: any,
  ) {
    const ipHeader = xForwardedFor || xRealIp || req?.socket?.remoteAddress || '127.0.0.1';
    const ip = ipHeader.split(',')[0].trim();
    console.log('Client IP:', ip);
    return this.authService.register(createAdminDto, ip, fingerprint);
  }

  @Post('test-register')
  async testRegister(
    @Body() body: { email: string; password: string; username: string; role: 'employer' | 'jobseeker' },
    @Res() res: Response,
    @Headers('x-forwarded-for') xForwardedFor?: string,
    @Headers('x-real-ip') xRealIp?: string,
    @Headers('x-fingerprint') fingerprint?: string,
    @Req() req?: any,
  ) {
    const ipHeader = xForwardedFor || xRealIp || req?.socket?.remoteAddress || '127.0.0.1';
    const ip = ipHeader.split(',')[0].trim();
    console.log('Client IP:', ip);
    const registerDto = { email: body.email, password: body.password, username: body.username, role: body.role };
    const user = await this.authService.register(registerDto, ip, fingerprint);
    return res.json(user);
  }
}