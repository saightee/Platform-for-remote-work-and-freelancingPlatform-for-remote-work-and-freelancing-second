import { Injectable, UnauthorizedException, BadRequestException, Inject, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { BlockedCountriesService } from '../blocked-countries/blocked-countries.service';
import * as bcrypt from 'bcrypt';
import * as geoip from 'geoip-lite';
import { RegisterDto } from './dto/register.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { LoginDto } from './dto/login.dto';
import { v4 as uuidv4 } from 'uuid';
import { Transporter } from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private redisService: RedisService,
    private blockedCountriesService: BlockedCountriesService,
    @Inject('MAILER_TRANSPORT') private mailerTransport: Transporter,
  ) {}

  async register(dto: RegisterDto | CreateAdminDto, ip?: string) {
    const { email, password, username } = dto;

    // Определяем страну по IP
    let country: string | null = null;
    if (ip) {
      const isBlocked = await this.blockedCountriesService.isCountryBlocked(ip);
      if (isBlocked) {
        throw new ForbiddenException('Registration is not allowed from your country');
      }
      const geo = geoip.lookup(ip);
      country = geo?.country || null;
      console.log('Detected country for IP', ip, ':', country);
    }

    console.log('Register DTO:', dto);
    const existingUser = await this.usersService.findByEmail(email);
    console.log('Existing User Check:', existingUser);
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    let role: 'employer' | 'jobseeker' | 'admin';
    if ('secretKey' in dto) {
      const validSecretKey = process.env.ADMIN_SECRET_KEY || 'mySuperSecretAdminKey123';
      if (dto.secretKey !== validSecretKey) {
        throw new UnauthorizedException('Invalid secret key');
      }
      role = 'admin';
    } else {
      role = dto.role;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Hashed Password:', hashedPassword);

    const userData = {
      email,
      password: hashedPassword,
      username,
      role,
      country,
    };
    const additionalData = {
      timezone: 'UTC',
      currency: 'USD',
    };
    const newUser = await this.usersService.create(userData, additionalData);
    console.log('New User Created:', newUser);

    const payload = { email: newUser.email, sub: newUser.id, role: newUser.role };
    const token = this.jwtService.sign(payload, { expiresIn: '1h' });
    await this.redisService.set(`token:${newUser.id}`, token, 3600);

    return { accessToken: token };
  }

  async login(loginDto: LoginDto) {
    const { email, password, rememberMe } = loginDto;
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
  
    if (user.status === 'blocked') {
      throw new UnauthorizedException('User is blocked');
    }
  
    const isBlacklisted = await this.isTokenBlacklisted(`token:${user.id}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Previous session was invalidated');
    }
  
    const payload = { email: user.email, sub: user.id, role: user.role };
    const expiresIn = rememberMe ? '7d' : '1h';
    const token = this.jwtService.sign(payload, { expiresIn });
    const expirySeconds = rememberMe ? 7 * 24 * 60 * 60 : 3600;
    await this.redisService.set(`token:${user.id}`, token, expirySeconds);
  
    return { accessToken: token };
  }

  async logout(userId: number) {
    const token = await this.redisService.get(`token:${userId}`);
    if (token) {
      await this.redisService.set(`blacklist:${token}`, 'true', 3600);
      await this.redisService.del(`token:${userId}`);
    }
    return { message: 'Logout successful' };
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklisted = await this.redisService.get(`blacklist:${token}`);
    return blacklisted === 'true';
  }

  async storeOAuthUserData(user: { email: string; username: string; provider: string; role: 'employer' | 'jobseeker' }) {
    const tempToken = uuidv4();
    await this.redisService.set(`oauth:${tempToken}`, JSON.stringify(user), 3600);
    return tempToken;
  }

  async completeRegistration(tempToken: string, role: 'employer' | 'jobseeker', additionalData: any) {
    const userDataString = await this.redisService.get(`oauth:${tempToken}`);
    if (!userDataString) {
      throw new BadRequestException('Invalid or expired token');
    }
    const userData = JSON.parse(userDataString);
    console.log('User Data:', userData);
  
    let existingUser = await this.usersService.findByEmail(userData.email);
    if (!existingUser) {
      const userToCreate = {
        email: userData.email,
        username: userData.username,
        password: userData.password || '',
        provider: userData.provider,
        role: userData.role || role,
      };
      existingUser = await this.usersService.create(userToCreate, additionalData);
      console.log('New User Created:', existingUser);
    } else {
      console.log('Existing User Found:', existingUser);
      await this.usersService.updateUser(existingUser.id, userData.role || role, additionalData);
      console.log('User Updated:', { role: userData.role || role, additionalData });
    }
  
    const payload = { email: existingUser.email, sub: existingUser.id, role: existingUser.role };
    const token = this.jwtService.sign(payload, { expiresIn: '1h' });
    await this.redisService.set(`token:${existingUser.id}`, token, 3600);
    await this.redisService.del(`oauth:${tempToken}`);
    return { accessToken: token };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const resetToken = uuidv4();
    await this.redisService.set(`reset:${resetToken}`, user.id.toString(), 3600);
    const resetLink = `http://localhost:3000/auth/reset-password?token=${resetToken}`;
    await this.mailerTransport.sendMail({
      from: `"OnlineJobs" <your-email@example.com>`,
      to: email,
      subject: 'Password Reset Request',
      text: `Click the following link to reset your password: ${resetLink}`,
    });
    return { message: 'Password reset link sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.redisService.get(`reset:${token}`);
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashedPassword);
    await this.redisService.del(`reset:${token}`);
    return { message: 'Password reset successful' };
  }
}