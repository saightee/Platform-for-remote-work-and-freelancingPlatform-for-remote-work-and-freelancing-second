import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) {}

  async sendVerificationEmail(toEmail: string, username: string, verificationToken: string): Promise<void> {
    // Заглушка для локальной разработки
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      console.log(`[Mock] Verification email sent to ${toEmail} with token ${verificationToken}`);
      return;
    }

    const maxRetries = 3;
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        console.log(`Attempt ${attempt} to send verification email to ${toEmail}`);
        const verificationLink = `${this.configService.get<string>('BASE_URL')}/api/auth/verify-email?token=${verificationToken}`;
        const response = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: { name: 'JobForge', email: 'support@jobforge.net' },
            to: [{ email: toEmail, name: username }],
            subject: 'Подтвердите ваш аккаунт JobForge',
            htmlContent: `
              <html>
                <body>
                  <h2>Добро пожаловать на JobForge, ${username}!</h2>
                  <p>Пожалуйста, подтвердите ваш email, перейдя по ссылке ниже:</p>
                  <a href="${verificationLink}">Подтвердить Email</a>
                  <p>Если вы не регистрировались, проигнорируйте это письмо.</p>
                </body>
              </html>
            `,
          },
          {
            headers: {
              'api-key': this.configService.get<string>('BREVO_API_KEY'),
              'Content-Type': 'application/json',
            },
            timeout: 15000, // 15 секунд
          },
        );
        console.log(`Verification email sent to ${toEmail}:`, response.data);
        return;
      } catch (error) {
        console.error(`Attempt ${attempt} failed for ${toEmail}:`, error.message);
        if (attempt === maxRetries) {
          throw new Error(`Failed to send verification email after ${maxRetries} attempts: ${error.message}`);
        }
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  async sendPasswordResetEmail(toEmail: string, username: string, resetToken: string): Promise<void> {
    // Заглушка для локальной разработки
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      console.log(`[Mock] Password reset email sent to ${toEmail} with token ${resetToken}`);
      return;
    }

    const maxRetries = 3;
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        console.log(`Attempt ${attempt} to send password reset email to ${toEmail}`);
        const resetLink = `${this.configService.get<string>('BASE_URL')}/api/auth/reset-password?token=${resetToken}`;
        const response = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: { name: 'JobForge', email: 'support@jobforge.net' },
            to: [{ email: toEmail, name: username }],
            subject: 'Сброс пароля JobForge',
            htmlContent: `
              <html>
                <body>
                  <h2>Запрос на сброс пароля</h2>
                  <p>Здравствуйте, ${username},</p>
                  <p>Вы запросили сброс пароля. Перейдите по ссылке ниже, чтобы продолжить:</p>
                  <a href="${resetLink}">Сбросить пароль</a>
                  <p>Ссылка действительна 1 час. Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
                </body>
              </html>
            `,
          },
          {
            headers: {
              'api-key': this.configService.get<string>('BREVO_API_KEY'),
              'Content-Type': 'application/json',
            },
            timeout: 15000, // 15 секунд
          },
        );
        console.log(`Password reset email sent to ${toEmail}:`, response.data);
        return;
      } catch (error) {
        console.error(`Attempt ${attempt} failed for ${toEmail}:`, error.message);
        if (attempt === maxRetries) {
          throw new Error(`Failed to send password reset email after ${maxRetries} attempts: ${error.message}`);
        }
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  async sendJobNotification(
  toEmail: string,
  username: string,
  jobTitle: string,
  jobDescription: string,
  jobLink: string,
): Promise<void> {
  if (this.configService.get('NODE_ENV') === 'development') {
    console.log(`[Mock] Job notification email sent to ${toEmail} for job "${jobTitle}" with link ${jobLink}`);
    return;
  }

  const maxRetries = 3;
  let attempt = 1;

  while (attempt <= maxRetries) {
    try {
      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { name: 'JobForge', email: 'support@jobforge.net' },
          to: [{ email: toEmail, name: username }],
          subject: `New Job Opportunity: ${jobTitle}`,
          htmlContent: `
            <p>Hello, ${username},</p>
            <p>We found a new job that matches your experience:</p>
            <h3>${jobTitle}</h3>
            <p>${jobDescription}</p>
            <p><a href="${jobLink}">View Job Details</a></p>
            <p>Best regards,<br>JobForge Team</p>
          `,
        },
        {
          headers: {
            'api-key': this.configService.get('BREVO_API_KEY'),
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );
      console.log(`Job notification email sent to ${toEmail}:`, response.data);
      return;
    } catch (error) {
      console.error(`Attempt ${attempt} failed for ${toEmail}:`, error.message);
      if (attempt === maxRetries) {
        throw new Error(`Failed to send job notification email after ${maxRetries} attempts: ${error.message}`);
      }
      attempt++;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
}
}