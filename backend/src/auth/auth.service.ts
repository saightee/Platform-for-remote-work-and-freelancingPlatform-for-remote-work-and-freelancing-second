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
import { v4 as uuidv4 } from 'uuid';
import { Transporter } from 'nodemailer';
import { AdminService } from '../admin/admin.service';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';

const normalizeEmail = (e: string) => (e || '').trim().toLowerCase();
const isStrongPassword = (pw: string) =>
  typeof pw === 'string' &&
  pw.length >= 10 &&
  /[a-z]/.test(pw) &&
  /[A-Z]/.test(pw) &&
  /\d/.test(pw) &&
  /[^A-Za-z0-9]/.test(pw);
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
    private adminService: AdminService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto | CreateAdminDto | CreateModeratorDto, ip: string, fingerprint?: string, refCode?: string) {
    const emailNorm = (dto.email || '').trim().toLowerCase();
    const username = (dto as any).username;
    const password = (dto as any).password;

    let country: string | null = null;
    if ('country' in dto && typeof (dto as any).country === 'string' && (dto as any).country.trim()) {
      country = (dto as any).country.trim().toUpperCase();
    } else if (ip) {
      const isBlocked = await this.blockedCountriesService.isCountryBlocked(ip);
      if (isBlocked) throw new ForbiddenException('Registration is not allowed from your country');
      const geo = (geoip as any).lookup(ip);
      country = geo?.country ?? null;
    }

    if (!isStrongPassword(password)) throw new BadRequestException('Weak password');

    const existingUser = await this.usersService.findByEmail(emailNorm);
    if (existingUser) {
      if (!existingUser.is_email_verified) {
        const rlKey = `verify_resend:${existingUser.id}`;
        const locked = await this.redisService.get(rlKey);
        if (!locked) {
          const token = uuidv4();
          await this.redisService.set(`verify:${token}`, String(existingUser.id), 3600);
          await this.redisService.set(`verify_latest:${existingUser.id}`, token, 3600);
          await this.emailService.sendVerificationEmail(existingUser.email, existingUser.username, token);
          await this.redisService.set(rlKey, '1', 300);
        }
        return { message: 'Account exists but not verified. We sent a new confirmation link.' };
      }
      throw new BadRequestException('Email already exists');
    }

    let role: 'employer' | 'jobseeker' | 'admin' | 'moderator';
    if ('secretKey' in dto) {
      const validSecretKey = this.configService.get<string>('ADMIN_SECRET_KEY');
      if ((dto as any).secretKey !== validSecretKey) throw new UnauthorizedException('Invalid secret key');
      role = (dto as any).email.includes('moderator') ? 'moderator' : 'admin';
    } else {
      role = (dto as RegisterDto).role;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      email: emailNorm,
      username,
      password: hashedPassword,
      role,
      country,
      is_email_verified: role === 'admin' || role === 'moderator',
      referral_source: refCode || null,
      brand: (dto as any).__brand || null,
    } as any;

    const additionalData: any = { timezone: 'UTC', currency: 'USD' };

    if (role === 'jobseeker') {
      const r = dto as RegisterDto;
      if (r.skills) additionalData.skills = r.skills;
      if (r.experience) additionalData.experience = r.experience;
      if (r.resume) additionalData.resume = r.resume || null;
      additionalData.linkedin = r.linkedin || null;
      additionalData.instagram = r.instagram || null;
      additionalData.facebook = r.facebook || null;
      additionalData.whatsapp = r.whatsapp || null;
      additionalData.telegram = r.telegram || null;
      if (r.description) {
        const words = r.description.trim().split(/\s+/).slice(0, 150);
        additionalData.description = words.join(' ');
      }
      if (Array.isArray(r.languages)) {
        additionalData.languages = r.languages;
      }
    }

    const newUser = await this.usersService.create(userData, additionalData);

    try {
      if (fingerprint) {
        await this.antiFraudService.calculateRiskScore(newUser.id, fingerprint, ip);
      }
    } catch (e) {
      console.error('[AntiFraud] calc on register failed:', e?.message || e);
    }

    if (refCode) { try { await this.adminService.incrementRegistration(refCode, newUser.id); } catch {} }

    if (role === 'admin' || role === 'moderator') {
      const payload = { email: newUser.email, sub: newUser.id, role: newUser.role };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      return { accessToken };
    }

    try {
      const verificationToken = uuidv4();
      await this.redisService.set(`verify:${verificationToken}`, newUser.id, 3600);
      await this.redisService.set(`verify_latest:${newUser.id}`, verificationToken, 3600);
      await this.emailService.sendVerificationEmail(emailNorm, username, verificationToken);
    } catch {
      return { message: 'Регистрация успешна, но email не отправлен. Проверьте папку "Spam" или запросите повторно.' };
    }

    return { message: 'Registration is successful. Please confirm your email.' };
  }

  async verifyEmail(token: string): Promise<{ message: string; accessToken: string }> {
      console.log(`[verifyEmail] Start verification with token: ${token}`);
      const userId = await this.redisService.get(`verify:${token}`);
      if (!userId) throw new BadRequestException('Invalid or expired verification token');

      const latest = await this.redisService.get(`verify_latest:${userId}`);
      if (latest && latest !== token) {
        throw new BadRequestException('Invalid or expired verification token');
      }

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
      await this.redisService.del(`verify_latest:${userId}`);
      console.log(`[verifyEmail] Token removed from Redis: verify:${token}`);
    
      const payload = { email: user.email, sub: user.id, role: user.role };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
      await this.redisService.set(`token:${user.id}`, accessToken, 7 * 24 * 60 * 60);
      return { message: 'Email successfully confirmed', accessToken };
    }

  async login(
    email: string,
    password: string,
    rememberMe: boolean,
    ip: string,
    fingerprint: string,
    session: any,
  ) {
    const emailNorm = normalizeEmail(email);

    const rlKey = `rl:login:${emailNorm}:${ip || 'noip'}:${fingerprint || 'nofp'}`;
    const fails = Number((await this.redisService.get(rlKey)) || 0);
    if (fails >= 5) {
      throw new UnauthorizedException('Too many attempts. Try later.');
    }

    const user = await this.usersService.findByEmail(emailNorm);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      await this.redisService.set(rlKey, String(fails + 1), 600);
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.redisService.del(rlKey);

    if (user.status === 'blocked') throw new UnauthorizedException('User is blocked');
    if (!user.is_email_verified && user.role !== 'admin' && user.role !== 'moderator') {
      throw new UnauthorizedException('Please confirm your email before logging in');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const expiresIn = rememberMe ? '30d' : '7d';
    const token = this.jwtService.sign(payload, { expiresIn });
    const expirySeconds = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;

    await this.redisService.set(`token:${user.id}`, token, expirySeconds);
    await this.redisService.setUserOnline(user.id, user.role as 'jobseeker' | 'employer');

    await this.usersService.setLastLoginAt(user.id);
    await this.usersService.touchLastSeen(user.id);

    try {
      if (fingerprint && ip) {
        await this.antiFraudService.calculateRiskScore(user.id, fingerprint, ip);
      }
    } catch (e) {
      console.error('[AntiFraud] calc on login failed:', e?.message || e);
    }

    return new Promise((resolve, reject) => {
      session.regenerate((err) => {
        if (err) {
          reject(new BadRequestException('Failed to regenerate session'));
          return;
        }
        session.cookie.maxAge = rememberMe
          ? 30 * 24 * 60 * 60 * 1000
          : 7 * 24 * 60 * 60 * 1000;

        session.user = { id: user.id, email: user.email, role: user.role };
        resolve({ accessToken: token });
      });
    });
  }

  async logout(userId: string) {
    const token = await this.redisService.get(`token:${userId}`);
    if (token) {
      const decoded: any = this.jwtService.decode(token);
      const now = Math.floor(Date.now() / 1000);
      const exp = typeof decoded?.exp === 'number' ? decoded.exp : null;
      const ttl = exp ? Math.max(exp - now, 0) : 3600;

      await this.redisService.set(`blacklist:${token}`, 'true', ttl);
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
    const token = this.jwtService.sign(payload, { expiresIn: '7d' });
    await this.redisService.set(`token:${existingUser.id}`, token, 7 * 24 * 60 * 60);
    await this.redisService.del(`oauth:${tempToken}`);
    return { accessToken: token };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(normalizeEmail(email));
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
    if (!isStrongPassword(newPassword)) {
      throw new BadRequestException('Weak password');
    }

    const userId = await this.redisService.get(`reset:${token}`);
    if (!userId) throw new BadRequestException('Invalid or expired reset token');

    const user = await this.usersService.getUserById(userId);
    if (!user) throw new BadRequestException('User not found');
    if (user.role === 'admin' || user.role === 'moderator') {
      throw new UnauthorizedException('Password reset is not allowed for admin or moderator roles');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashedPassword);

    const old = await this.redisService.get(`token:${userId}`);
    if (old) {
      const decoded: any = this.jwtService.decode(old);
      const now = Math.floor(Date.now() / 1000);
      const exp = typeof decoded?.exp === 'number' ? decoded.exp : null;
      const ttl = exp ? Math.max(exp - now, 0) : 3600;
      await this.redisService.set(`blacklist:${old}`, 'true', ttl);
      await this.redisService.del(`token:${userId}`);
    }

    await this.redisService.del(`reset:${token}`);
    return { message: 'Password reset successful' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findByEmail(normalizeEmail(email));
    if (!user) return;
    if (user.is_email_verified) return;

    const rlKey = `verify_resend:${user.id}`;
    const locked = await this.redisService.get(rlKey);
    if (locked) {
      throw new HttpException('Please wait before requesting another verification email', HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.redisService.set(rlKey, '1', 300);

    const token = uuidv4();
    await this.redisService.set(`verify:${token}`, String(user.id), 3600);
    await this.redisService.set(`verify_latest:${user.id}`, token, 3600);
    await this.emailService.sendVerificationEmail(user.email, user.username, token);
  }
}