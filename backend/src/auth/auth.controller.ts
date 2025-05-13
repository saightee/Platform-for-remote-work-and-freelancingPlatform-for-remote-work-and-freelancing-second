import { Controller, Post, Body, Headers, UnauthorizedException, Get, UseGuards, Request, Res } from '@nestjs/common';
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
  async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
    const { tempToken } = await this.authService.register(registerDto);
    // Перенаправляем на фронтенд-страницу, а не на API-маршрут
    res.redirect(`http://localhost:3000/select-role?tempToken=${tempToken}`);
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
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    console.log('Google Callback - req.user:', req.user);
    try {
      const tempToken = await this.authService.storeOAuthUserData(req.user);
      console.log('Google Callback - Temp Token:', tempToken);
      res.redirect(`https://localhost:3000/select-role?tempToken=${tempToken}`);
    } catch (error) {
      console.error('Google Callback - Error:', error);
      return res.status(500).json({ message: 'Authentication failed', error: error.message });
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Post('select-role')
  async selectRole(
    @Body() body: { tempToken: string; role: 'employer' | 'jobseeker'; company_name?: string; company_info?: string; referral_link?: string; skills?: string[]; experience?: string; portfolio?: string; video_intro?: string; timezone?: string; currency?: string },
    @Res() res: Response,
  ) {
    try {
      const user = await this.authService.completeRegistration(body.tempToken, body.role, {
        company_name: body.company_name,
        company_info: body.company_info,
        referral_link: body.referral_link,
        skills: body.skills,
        experience: body.experience,
        portfolio: body.portfolio,
        video_intro: body.video_intro,
        timezone: body.timezone,
        currency: body.currency,
      });
      console.log('Select Role - Generated Token:', user);
      return res.json(user);
    } catch (error) {
      console.error('Select Role - Error:', error);
      return res.status(500).json({ message: 'Role selection failed', error: error.message });
    }
  }

  @Post('test-register')
  async testRegister(
    @Body() body: { email: string; password: string; username: string; role: 'employer' | 'jobseeker'; company_name?: string; company_info?: string; referral_link?: string; skills?: string[]; experience?: string; portfolio?: string; video_intro?: string; timezone?: string; currency?: string },
    @Res() res: Response,
  ) {
    const registerDto = { email: body.email, password: body.password, username: body.username };
    const { tempToken } = await this.authService.register(registerDto);
    const additionalData = {
      company_name: body.company_name,
      company_info: body.company_info,
      referral_link: body.referral_link,
      skills: body.skills,
      experience: body.experience,
      portfolio: body.portfolio,
      video_intro: body.video_intro,
      timezone: body.timezone,
      currency: body.currency,
    };
    const user = await this.authService.completeRegistration(tempToken, body.role, additionalData);
    return res.json(user);
  }
}