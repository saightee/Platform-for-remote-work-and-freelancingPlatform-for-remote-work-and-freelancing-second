import { Injectable, UnauthorizedException, BadRequestException, Inject, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { BlockedCountriesService } from '../blocked-countries/blocked-countries.service';
import { AntiFraudService } from '../anti-fraud/anti-fraud.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import * as geoip from 'geoip-lite';
import { RegisterDto } from './dto/register.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateModeratorDto } from './dto/create-moderator.dto';
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
    private antiFraudService: AntiFraudService,
    private emailService: EmailService,
    @Inject('MAILER_TRANSPORT') private mailerTransport: Transporter,
  ) {}

  async register(dto: RegisterDto | CreateAdminDto | CreateModeratorDto, ip: string, fingerprint?: string) {
    console.log('Начало регистрации:', dto);
    const { email, password, username } = dto;

    let country: string | null = null;
    if (ip) {
      const isBlocked = await this.blockedCountriesService.isCountryBlocked(ip);
      if (isBlocked) {
        throw new ForbiddenException('Registration is not allowed from your country');
      }
      const geo = geoip.lookup(ip);
      country = geo?.country ?? null;
      console.log('Detected country for IP', ip, ':', country);
    }

    const existingUser = await this.usersService.findByEmail(email);
    console.log('Existing User Check:', existingUser);
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    let role: 'employer' | 'jobseeker' | 'admin' | 'moderator';
    if ('secretKey' in dto) {
      const validSecretKey = process.env.ADMIN_SECRET_KEY || 'mySuperSecretAdminKey123';
      if (dto.secretKey !== validSecretKey) {
        throw new UnauthorizedException('Invalid secret key');
      }
      role = (dto as CreateModeratorDto).email.includes('moderator') ? 'moderator' : 'admin'; 
    } else {
      role = (dto as RegisterDto).role;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Hashed Password:', hashedPassword);

    const userData = {
      email,
      password: hashedPassword,
      username,
      role,
      country,
      is_email_verified: role === 'admin' || role === 'moderator',
    };
    const additionalData: { timezone: string; currency: string; skills?: string[]; experience?: string } = {
      timezone: 'UTC',
      currency: 'USD',
    };

  if (role === 'jobseeker' && 'skills' in dto && 'experience' in dto) {
    additionalData.skills = dto.skills || [];
    additionalData.experience = dto.experience;
  }

    const newUser = await this.usersService.create(userData, additionalData);
    console.log('New User Created:', newUser);

    if (role === 'admin' || role === 'moderator') {
      const payload = { email: newUser.email, sub: newUser.id, role: newUser.role };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      return { accessToken };
    }

    if (fingerprint && ip) {
      await this.antiFraudService.calculateRiskScore(newUser.id, fingerprint, ip);
    }

    try {
      const verificationToken = uuidv4();
      console.log('Сохранение токена верификации в Redis:', verificationToken);
      await this.redisService.set(`verify:${verificationToken}`, newUser.id, 3600);
      console.log('Отправка верификационного email:', newUser.email);
      await this.emailService.sendVerificationEmail(email, username, verificationToken);
      console.log('Email отправлен успешно');
    } catch (error) {
      console.error(`Ошибка отправки верификационного email для ${newUser.email}:`, error.message);
      return { message: 'Регистрация успешна, но email не отправлен. Проверьте папку "Spam" или запросите повторно.' };
    }

    return { message: 'Registration is successful. Please confirm your email.' };
  }

  async verifyEmail(token: string): Promise<{ message: string; accessToken: string }> {  
      console.log(`[verifyEmail] Start verification with token: ${token}`);
      const userId = await this.redisService.get(`verify:${token}`);
      if (!userId) {
        console.error(`[verifyEmail] Invalid or expired token: ${token}`);
        throw new BadRequestException('Invalid or expired verification token');
      }
      console.log(`[verifyEmail] userId found: ${userId}`);

      const user = await this.usersService.getUserById(userId);
      if (!user) {
        console.error(`[verifyEmail] User not found for userId: ${userId}`);
        throw new BadRequestException('User not found');
      }
      console.log(`[verifyEmail] User found: ${user.email}, is_email_verified: ${user.is_email_verified}`);

      if (user.is_email_verified) {
        console.log(`[verifyEmail] Email already confirmed for ${user.email}`);
        throw new BadRequestException('Email has already been confirmed');
      }

      try {
        console.log(`[verifyEmail] Update is_email_verified for userId: ${userId}`);
        await this.usersService.updateUser(userId, user.role, { is_email_verified: true });
        console.log(`[verifyEmail] The update was successful for ${user.email}`);
      } catch (error) {
        console.error(`[verifyEmail] Error updating user: ${error.message}`);
        throw error;
      }

      await this.redisService.del(`verify:${token}`);
      console.log(`[verifyEmail] Token removed from Redis: verify:${token}`);

      const payload = { email: user.email, sub: user.id, role: user.role };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' }); 

      return { message: 'Email successfully confirmed', accessToken };
    }

  async login(email: string, password: string, rememberMe: boolean, ip: string, fingerprint: string, session: any) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
  
    if (user.status === 'blocked') {
      throw new UnauthorizedException('User is blocked');
    }
  
    if (!user.is_email_verified && user.role !== 'admin' && user.role !== 'moderator') {
      throw new UnauthorizedException('Please confirm your email before logging in');
    }
  
    const payload = { email: user.email, sub: user.id, role: user.role };
    const expiresIn = rememberMe ? '7d' : '1h';
    const token = this.jwtService.sign(payload, { expiresIn });
    const expirySeconds = rememberMe ? 7 * 24 * 60 * 60 : 3600;
    await this.redisService.set(`token:${user.id}`, token, expirySeconds);
    await this.redisService.setUserOnline(user.id, user.role as 'jobseeker' | 'employer');
    
    return new Promise((resolve, reject) => {
      session.regenerate((err) => {
        if (err) {
          console.error(`Login error: Failed to regenerate session for userId=${user.id}, error=${err.message}`);
          reject(new BadRequestException('Failed to regenerate session'));
        }
        session.user = { id: user.id, email: user.email, role: user.role };
        console.log(`Login success: userId=${user.id}, sessionID=${session.id}, token=${token}`);
        resolve({ accessToken: token });
      });
    });
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
        is_email_verified: true,
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

    if (user.role === 'admin' || user.role === 'moderator') {
      throw new UnauthorizedException('Password reset is not allowed for admin or moderator roles');
    }

    const resetToken = uuidv4();
    await this.redisService.set(`reset:${resetToken}`, user.id.toString(), 3600);
    await this.emailService.sendPasswordResetEmail(user.email, user.username, resetToken);
    return { message: 'Password reset link sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.redisService.get(`reset:${token}`);
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.usersService.getUserById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.role === 'admin' || user.role === 'moderator') {
      throw new UnauthorizedException('Password reset is not allowed for admin or moderator roles');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashedPassword);
    await this.redisService.del(`reset:${token}`);
    return { message: 'Password reset successful' };
  }
}