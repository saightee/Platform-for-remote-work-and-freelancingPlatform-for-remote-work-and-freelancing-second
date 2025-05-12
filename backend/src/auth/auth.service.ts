import { Injectable, UnauthorizedException, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { v4 as uuidv4 } from 'uuid';
import { Transporter } from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private redisService: RedisService,
    @Inject('MAILER_TRANSPORT') private mailerTransport: Transporter,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, username } = registerDto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      username,
    });

    return { message: 'User registered', userId: user.id };
  }

  async login(loginDto: LoginDto) {
    const { email, password, rememberMe } = loginDto;
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const expiresIn = rememberMe ? '30d' : '1h';
    const payload = { email: user.email, sub: user.id };
    const token = this.jwtService.sign(payload, { expiresIn });
    const expirySeconds = rememberMe ? 30 * 24 * 3600 : 3600;
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

  async loginWithOAuth(user: { email: string; username: string; provider: string }) {
    let existingUser = await this.usersService.findByEmail(user.email);
    if (!existingUser) {
      existingUser = await this.usersService.create({
        email: user.email,
        username: user.username,
        password: '',
        provider: user.provider,
      });
    }
    const payload = { email: existingUser.email, sub: existingUser.id };
    const token = this.jwtService.sign(payload);
    await this.redisService.set(`token:${existingUser.id}`, token, 3600);
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
    await this.usersService.updatePassword(parseInt(userId), hashedPassword);
    await this.redisService.del(`reset:${token}`);
    return { message: 'Password reset successful' };
  }
}