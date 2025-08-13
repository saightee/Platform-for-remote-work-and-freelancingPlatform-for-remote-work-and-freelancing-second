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
    const provider = this.config.get<string>('CONTACT_CAPTCHA_PROVIDER');
    if (!provider) return true;

    const secret = this.config.get<string>('CONTACT_CAPTCHA_SECRET');
    if (!secret) return true;

    try {
      if (provider === 'recaptcha') {
        const resp = await axios.post(
          'https://www.google.com/recaptcha/api/siteverify',
          new URLSearchParams({ secret, response: token || '' }),
          { timeout: 8000 },
        );
        return !!resp.data?.success;
      }
      if (provider === 'hcaptcha') {
        const resp = await axios.post(
          'https://hcaptcha.com/siteverify',
          new URLSearchParams({ secret, response: token || '' }),
          { timeout: 8000 },
        );
        return !!resp.data?.success;
      }
    } catch {
      return false;
    }
    return false;
  }

  async send({ name, email, message, website, captchaToken }: ContactMessageDto) {

    if (website && website.trim().length > 0) {
      throw new ForbiddenException('Spam detected.');
    }

    if (this.hasLinks(message)) {
      throw new BadRequestException('Links are not allowed in the message.');
    }

    const ok = await this.verifyCaptcha(captchaToken);
    if (!ok) throw new ForbiddenException('CAPTCHA verification failed.');

    await this.emailService.sendContactEmailViaTemplate(name.trim(), email.trim(), message.trim());
  }
}