import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ContactMessageDto } from './dto/contact-message.dto';
import { EmailService } from '../email/email.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ContactService {
  constructor(
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  private hasLinks(s: string) {
    return /(https?:\/\/|www\.|<a\s| \[url|\]\(https?:\/\/)/i.test(s);
  }

  private async verifyCaptcha(token?: string) {
    const provider = (this.config.get<string>('CONTACT_CAPTCHA_PROVIDER') || 'recaptcha').toLowerCase();
    const secret = this.config.get<string>('CONTACT_CAPTCHA_SECRET');

    if (!secret) return false;
    if (!token || !token.trim()) return false;

    try {
      if (provider === 'turnstile') {
        const resp = await axios.post(
          'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          new URLSearchParams({ secret, response: token }),
          { timeout: 8000 },
        );
        return !!resp.data?.success;
      }
      if (provider === 'hcaptcha') {
        const resp = await axios.post(
          'https://hcaptcha.com/siteverify',
          new URLSearchParams({ secret, response: token }),
          { timeout: 8000 },
        );
        return !!resp.data?.success;
      }
      const resp = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        new URLSearchParams({ secret, response: token }),
        { timeout: 8000 },
      );
      return !!resp.data?.success;
    } catch {
      return false;
    }
  }

  async send(dto: ContactMessageDto, user?: { userId: string; email?: string; name?: string }) {
    const { website, message } = dto;

    if (website && website.trim().length > 0) {
      throw new ForbiddenException('Spam detected.');
    }
    if (this.hasLinks(message)) {
      throw new BadRequestException('Links are not allowed in the message.');
    }

    const fromName = (user?.name ?? dto.name ?? '').trim();
    const fromEmail = (user?.email ?? dto.email ?? '').trim();

    if (!user) {
      const ok = await this.verifyCaptcha(dto.captchaToken);
      if (!ok) throw new ForbiddenException('CAPTCHA verification failed.');
    }

    const finalMessage = user?.userId
      ? `[userId: ${user.userId}]\n\n${message.trim()}`
      : message.trim();

    await this.emailService.sendContactEmailViaTemplate(fromName, fromEmail, finalMessage);
  }
}