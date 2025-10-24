import { Controller, Post, Body, Headers, UnauthorizedException, Get, UseGuards, Request, Res, Query, Req, BadRequestException, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateModeratorDto } from './dto/create-moderator.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';  
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { S3StorageService } from '../storage/s3-storage.service';
import { pickCdnBaseByHost } from '../common/cdn.util';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { join, extname } from 'path';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

const filesDriver = process.env.FILES_DRIVER || 's3';

function mapBrandFromReq(req: any): string | null {
  const explicit = req.headers['x-site-brand'];
  if (explicit && typeof explicit === 'string') {
    return explicit.trim().toLowerCase();
  }

  const domainFrom = (urlStr?: string) => {
    try { return new URL(urlStr!).hostname.toLowerCase(); } catch { return ''; }
  };

  const origin = domainFrom(req.headers.origin);
  const referer = domainFrom(req.headers.referer);
  const host = (req.headers.host || '').toLowerCase();

  const hostLike = origin || referer || host;

  if (!hostLike) return null;

  if (hostLike.includes('22resumes.com')) return '22resumes';
  if (hostLike.includes('jobforge.net')) return 'jobforge';

  const parts = hostLike.split('.').filter(Boolean);
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return null;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private usersService: UsersService,
    private redisService: RedisService,
    private configService: ConfigService,
    private s3: S3StorageService,
  ) {}

  @Post('register')
  @UseInterceptors(FileFieldsInterceptor([
    {
      name: 'resume_file',
      maxCount: 1,
    },
    {
      name: 'avatar_file',
      maxCount: 1,
    },
  ], {
    storage: memoryStorage(),
    fileFilter: (req, file, cb) => {
      if (file.fieldname === 'resume_file') {
        const allowedExt = /\.(pdf|doc|docx)$/i.test(file.originalname);
        const allowedMime = /pdf|msword|officedocument\.wordprocessingml\.document/.test(file.mimetype);
        return allowedExt && allowedMime
          ? cb(null, true)
          : cb(new BadRequestException('Only PDF, DOC, and DOCX files are allowed for resume'), false);
      }
      if (file.fieldname === 'avatar_file') {
        const allowedExt = /\.(jpg|jpeg|png|webp)$/i.test(file.originalname);
        const allowedMime = /^image\/(jpeg|png|webp)$/.test(file.mimetype);
        return allowedExt && allowedMime
          ? cb(null, true)
          : cb(new BadRequestException('Avatar must be an image: JPG, PNG, or WEBP'), false);
      }
      return cb(new BadRequestException('Unexpected file field'), false);
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async register(
    @Body() registerDto: RegisterDto & { ref?: string },
    @Headers('x-forwarded-for') xForwardedFor?: string,
    @Headers('x-real-ip') xRealIp?: string,
    @Headers('x-fingerprint') fingerprint?: string,
    @Headers('host') host?: string,
    @Req() req?: any,
    @UploadedFiles() files?: { resume_file?: Express.Multer.File[]; avatar_file?: Express.Multer.File[] },
  ) {
    const ipHeader = xForwardedFor || xRealIp || req?.socket?.remoteAddress || '127.0.0.1';
    const ip = (ipHeader || '').split(',')[0].trim();
    if (!fingerprint) throw new BadRequestException('Fingerprint is required');

    const resumeFile = files?.resume_file?.[0];
    const avatarFile = files?.avatar_file?.[0];

    if (resumeFile?.buffer?.length) {
      if (filesDriver === 's3' && process.env.AWS_S3_BUCKET) {
        const { key } = await this.s3.uploadBuffer(resumeFile.buffer, {
          prefix: 'resumes',
          originalName: resumeFile.originalname,
          contentType: resumeFile.mimetype,
        });
        const cdnBase = pickCdnBaseByHost(host);
        registerDto.resume = `${cdnBase}/${key}`;
      } else {
        const ext = extname(resumeFile.originalname) || '';
        const name = `${randomUUID()}${ext}`;
        const dir = './uploads/resumes';
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(join(dir, name), resumeFile.buffer);
        registerDto.resume = `${process.env.BASE_URL}/uploads/resumes/${name}`;
      }
    }

    let avatarUrl: string | undefined;
    if (avatarFile?.buffer?.length) {
      if (filesDriver === 's3' && process.env.AWS_S3_BUCKET) {
        const { key } = await this.s3.uploadBuffer(avatarFile.buffer, {
          prefix: 'avatars',
          originalName: avatarFile.originalname,
          contentType: avatarFile.mimetype,
        });
        const cdnBase = pickCdnBaseByHost(host);
        avatarUrl = `${cdnBase}/${key}`;
      } else {
        const ext = extname(avatarFile.originalname) || '';
        const name = `${randomUUID()}${ext}`;
        const dir = './uploads/avatars';
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(join(dir, name), avatarFile.buffer);
        avatarUrl = `${process.env.BASE_URL}/uploads/avatars/${name}`;
      }
    }

    const brand = mapBrandFromReq(req) || null;
    (registerDto as any).__brand = brand;

    return this.authService.register(registerDto, ip, fingerprint, registerDto.ref, avatarUrl);
  }

  @Get('verify-email')
    async verifyEmail(@Query('token') token: string, @Res() res: Response) { 
      try {
        const { message, accessToken } = await this.authService.verifyEmail(token);  

        const frontendUrl = this.configService.get<string>('BASE_URL')!;
        res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&verified=true`);
      } catch (error) {
        const frontendUrl = this.configService.get<string>('BASE_URL')!;
        if (error instanceof BadRequestException) {
          res.redirect(`${frontendUrl}/auth/callback?error=invalid_token`);
        } else {
          res.redirect(`${frontendUrl}/auth/callback?error=server_error`);
        }
      }
    }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    return this.authService.login(
      loginDto.email,
      loginDto.password,
      loginDto.rememberMe ?? false, 
      req.ip,
      req.headers['x-fingerprint'],
      req.session,
    );
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
      const newToken = this.jwtService.sign(newPayload, { expiresIn: '7d' });
      await this.redisService.set(`token:${user.id}`, newToken, 7 * 24 * 60 * 60);
    
      return { accessToken: newToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Post('logout')
  async logout(@Headers('authorization') authHeader: string, @Req() req: any, @Res() res: Response) {
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
    await this.authService.logout(userId); 
    req.session.destroy((err) => { if (err) console.error(err); });
    res.clearCookie('sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return res.json({ message: 'Logout successful' });
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

  @Post('create-moderator')
  async createModerator(
    @Body() createModeratorDto: CreateModeratorDto,
    @Headers('x-forwarded-for') xForwardedFor?: string,
    @Headers('x-real-ip') xRealIp?: string,
    @Headers('x-fingerprint') fingerprint?: string,
    @Req() req?: any,
  ) {
    const ipHeader = xForwardedFor || xRealIp || req?.socket?.remoteAddress || '127.0.0.1';
    const ip = ipHeader.split(',')[0].trim();
    console.log('Client IP:', ip);
    return this.authService.register(createModeratorDto, ip, fingerprint);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
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
    console.log('Клиентский IP:', ip);
    const registerDto = { email: body.email, password: body.password, username: body.username, role: body.role };
    const user = await this.authService.register(registerDto, ip, fingerprint);
    return res.json(user);
  }

  @Post('resend-verification')
  async resendVerification(@Body('email') email: string) {
    await this.authService.resendVerificationEmail(email);
    return { message: 'If the account exists and is not verified, we sent a new link.' };
  }
}