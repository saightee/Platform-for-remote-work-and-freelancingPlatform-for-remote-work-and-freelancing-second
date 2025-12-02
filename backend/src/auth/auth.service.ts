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
import { SettingsService } from '../settings/settings.service';
import { AffiliateRegisterDto } from './dto/affiliate-register.dto';
import { AffiliateProgramService } from '../affiliate-program/affiliate-program.service';

function isValidUsername(username: string): boolean {
  // Только буквы (латиница и кириллица), цифры и пробелы
  return /^[a-zA-Zа-яА-ЯёЁ0-9\s]+$/.test(username);
}

const normalizeEmail = (e: string) => (e || '').trim().toLowerCase();
const isStrongPassword = (pw: string) =>
  typeof pw === 'string' &&
  pw.length >= 10 &&
  /[a-z]/.test(pw) &&
  /[A-Z]/.test(pw) &&
  /\d/.test(pw) &&
  /[^A-Za-z0-9]/.test(pw);
const PENDING_SESSION_TTL_SECONDS = 2 * 24 * 60 * 60;
const LOGIN_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private redisService: RedisService,
    private blockedCountriesService: BlockedCountriesService,
    private antiFraudService: AntiFraudService,
    private emailService: EmailService,
    private adminService: AdminService,
    private configService: ConfigService,
    private settingsService: SettingsService, 
    private affiliateProgramService: AffiliateProgramService,
  ) {}

  async register(
    dto: RegisterDto | CreateAdminDto | CreateModeratorDto | AffiliateRegisterDto,
    ip: string,
    fingerprint?: string,
    refCode?: string,
    avatarUrl?: string,
    affCode?: string,
    affClickId?: string,
  ) {
    const emailNorm = (dto.email || '').trim().toLowerCase();
    const username = (dto as any).username;
    const password = (dto as any).password;

    if (!username || typeof username !== 'string') {
      throw new BadRequestException('Username is required');
    }
    const usernameTrimmed = username.trim();
    if (!usernameTrimmed) {
      throw new BadRequestException('Username cannot be empty');
    }
    if (usernameTrimmed.length > 100) {
      throw new BadRequestException('Username is too long (max 100)');
    }
    if (!isValidUsername(usernameTrimmed)) {
      throw new BadRequestException('Username can only contain letters, numbers, and spaces');
    }

    const isPrivileged = 'secretKey' in dto;

    if (!isPrivileged && ip) {
      const blockedByIp = await this.blockedCountriesService.isCountryBlocked(ip);
      if (blockedByIp) {
        throw new ForbiddenException('Registration is not allowed from your country');
      }
    }

    let country: string | null = null;
    if ('country' in dto && typeof (dto as any).country === 'string' && (dto as any).country.trim()) {
      country = (dto as any).country.trim().toUpperCase();
    } else if (ip) {
      const geo = (geoip as any).lookup(ip);
      country = geo?.country ?? null;
    }

    if (!isStrongPassword(password)) throw new BadRequestException('Weak password');

    const existingUser = await this.usersService.findByEmail(emailNorm);
    if (existingUser) {
      if (!existingUser.is_email_verified) {
        const pendingSessionId = uuidv4();
        await this.redisService.set(
          `pending_session:${pendingSessionId}`,
          JSON.stringify({ userId: existingUser.id, status: 'pending' }),
          PENDING_SESSION_TTL_SECONDS,
        );
        await this.redisService.set(
          `pending_session_latest:${existingUser.id}`,
          pendingSessionId,
          PENDING_SESSION_TTL_SECONDS,
        );

        const rlKey = `verify_resend:${existingUser.id}`;
        const locked = await this.redisService.get(rlKey);
        if (!locked) {
          const token = uuidv4();
          await this.redisService.set(`verify:${token}`, String(existingUser.id), 3600);
          await this.redisService.set(`verify_latest:${existingUser.id}`, token, 3600);
          await this.emailService.sendVerificationEmail(existingUser.email, existingUser.username, token);
          await this.redisService.set(rlKey, '1', 300);
        }

        return {
          message: 'Account exists but not verified. We sent a new confirmation link.',
          pending_session_id: pendingSessionId,
        };
      }
      throw new BadRequestException('Email already exists');
    }

    let role: 'employer' | 'jobseeker' | 'admin' | 'moderator' | 'affiliate';
    if (isPrivileged) {
      const validSecretKey = this.configService.get<string>('ADMIN_SECRET_KEY');
      if ((dto as any).secretKey !== validSecretKey) throw new UnauthorizedException('Invalid secret key');
      role = (dto as any).email.includes('moderator') ? 'moderator' : 'admin';
    } else {
      role = (dto as RegisterDto | AffiliateRegisterDto).role as any;
    }

    if (role === 'jobseeker') {
      const { required } = await this.settingsService.getRequireAvatarOnRegistration();
      if (required && !avatarUrl) {
        throw new BadRequestException('Avatar is required for jobseeker registration');
      }
      const r = dto as RegisterDto;
      const resumeUrl = r.resume?.trim();
      if (!resumeUrl) {
        throw new BadRequestException('Resume is required for jobseeker registration');
      }
      const dob = (r as any).date_of_birth ? String((r as any).date_of_birth).trim() : '';
      if (!dob) {
        throw new BadRequestException('date_of_birth is required for jobseeker registration');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        throw new BadRequestException('date_of_birth must be in format YYYY-MM-DD');
      }
    }

    if (role === 'affiliate') {
      const a = dto as AffiliateRegisterDto;
      if (!a.website_url || typeof a.website_url !== 'string') {
        throw new BadRequestException('website_url is required for affiliate registration');
      }
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
      avatar: avatarUrl || null,
    } as any;

    const additionalData: any = { timezone: 'UTC', currency: 'USD' };
    if (role === 'jobseeker') {
      const r = dto as RegisterDto;
      if (r.skills) additionalData.skills = r.skills;
      if (r.experience) additionalData.experience = r.experience;
      if (r.resume) additionalData.resume = r.resume || null;
      if ((r as any).date_of_birth) additionalData.date_of_birth = (r as any).date_of_birth;
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
      if (Array.isArray(r.portfolio)) {
        additionalData.portfolio = r.portfolio.slice(0, 10);
      }
      if (Array.isArray((r as any).portfolio_files) && (r as any).portfolio_files.length) {
        additionalData.portfolio_files = (r as any).portfolio_files.slice(0, 10);
      }
    }

    if (role === 'affiliate') {
      const a = dto as AffiliateRegisterDto;
      additionalData.account_type = a.account_type || 'individual';
      additionalData.company_name = a.company_name || null;
      additionalData.website_url = a.website_url;
      additionalData.traffic_sources = Array.isArray(a.traffic_sources) ? a.traffic_sources : [];
      additionalData.promo_geo = Array.isArray(a.promo_geo) ? a.promo_geo : [];
      additionalData.monthly_traffic = a.monthly_traffic || null;
      additionalData.payout_method = a.payout_method || null;
      additionalData.payout_details = a.payout_details || null;
      additionalData.telegram = a.telegram || null;
      additionalData.whatsapp = a.whatsapp || null;
      additionalData.skype = a.skype || null;
      additionalData.notes = a.notes || null;
    }

    const newUser = await this.usersService.create(userData, additionalData);

    try {
      if (fingerprint && ip) {
        await this.antiFraudService.calculateRiskScore(newUser.id, fingerprint, ip);
      }
    } catch (e) {
      console.error('[AntiFraud] calc on register failed:', e?.message || e);
    }
    if (refCode) {
      try {
        await this.adminService.incrementRegistration(refCode, newUser.id);
      } catch {}
    }

    try {
      const normalizedAffCode = affCode?.trim() || undefined;
      const normalizedClickId = affClickId?.trim() || undefined;
      const isAffiliateLead =
        (role === 'jobseeker' || role === 'employer') &&
        (normalizedAffCode || normalizedClickId);

      if (isAffiliateLead) {
        await this.affiliateProgramService.trackRegistration({
          userId: newUser.id,
          role: role as 'jobseeker' | 'employer',
          affCode: normalizedAffCode,
          clickId: normalizedClickId,
          country,
        });
      }
    } catch (err) {
      console.error('[Affiliate] trackRegistration failed', err);
    }

    if (role === 'admin' || role === 'moderator') {
      const payload = { email: newUser.email, sub: newUser.id, role: newUser.role };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      return { accessToken };
    }

    const pendingSessionId = uuidv4();
    await this.redisService.set(
      `pending_session:${pendingSessionId}`,
      JSON.stringify({ userId: newUser.id, status: 'pending' }),
      PENDING_SESSION_TTL_SECONDS,
    );
    await this.redisService.set(
      `pending_session_latest:${newUser.id}`,
      pendingSessionId,
      PENDING_SESSION_TTL_SECONDS,
    );

    try {
      const verificationToken = uuidv4();
      await this.redisService.set(`verify:${verificationToken}`, newUser.id, 3600);
      await this.redisService.set(`verify_latest:${newUser.id}`, verificationToken, 3600);
      await this.emailService.sendVerificationEmail(emailNorm, username, verificationToken);
    } catch {
      return {
        message:
          'Registration was successful, but the email was not sent. Please check your spam folder or try again.',
        pending_session_id: pendingSessionId,
      };
    }

    return {
      message: 'Registration is successful. Please confirm your email.',
      pending_session_id: pendingSessionId,
    };
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
      } catch (error: any) {
        console.error(`[verifyEmail] Error updating user: ${error.message}`);
        throw error;
      }

      await this.redisService.del(`verify:${token}`);
      await this.redisService.del(`verify_latest:${userId}`);
      console.log(`[verifyEmail] Token removed from Redis: verify:${token}`);
    
      const payload = { email: user.email, sub: user.id, role: user.role };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
      await this.redisService.set(`token:${user.id}`, accessToken, LOGIN_TOKEN_TTL_SECONDS);

      try {
        const pendingSessionId = await this.redisService.get(`pending_session_latest:${user.id}`);
        if (pendingSessionId) {
          const value = JSON.stringify({
            userId: user.id,
            status: 'verified',
            accessToken,
          });
          await this.redisService.set(
            `pending_session:${pendingSessionId}`,
            value,
            LOGIN_TOKEN_TTL_SECONDS,
          );
          console.log(
            `[verifyEmail] Pending session ${pendingSessionId} marked as verified for user ${user.id}`,
          );
        }
      } catch (e) {
        console.error('[verifyEmail] Failed to update pending session:', (e as any)?.message || e);
      }

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