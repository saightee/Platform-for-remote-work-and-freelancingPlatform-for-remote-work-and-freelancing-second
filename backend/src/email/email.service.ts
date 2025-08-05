import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

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

  private stripHtml(html: string): string {
    // Удаляем HTML-теги, оставляем текст
    return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }

async sendJobNotification(
    toEmail: string,
    username: string,
    jobTitle: string,
    jobDescription: string,
    jobLink: string,
  ): Promise<{ messageId: string }> {  // Возвращаем объект с messageId
    // Заглушка для локальной разработки
    if (this.configService.get('NODE_ENV') === 'development') {
      const mockMessageId = `mock-${uuidv4()}`;
      console.log(`[Mock] Job notification email sent to ${toEmail} for job "${jobTitle}" with link ${jobLink}. Mock messageId: ${mockMessageId}`);
      return { messageId: mockMessageId };  // Возвращаем mock data для использования в AdminService
    }

    const maxRetries = 3;
    let attempt = 1;

    const cleanedDescription = this.stripHtml(jobDescription);

    while (attempt <= maxRetries) {
      try {
        const response = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: { name: 'JobForge', email: 'support@jobforge.net' },
            to: [{ email: toEmail, name: username }],
            templateId: 5, 
            params: {
              username,
              jobTitle,
              jobDescription: cleanedDescription,
              jobLink,
            },
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
        return response.data;  // Возвращаем response.data с messageId
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

async sendJobPostRejectionNotification(
  toEmail: string,
  username: string,
  jobTitle: string,
  reason: string
): Promise<void> {
  // Заглушка для локальной разработки
  if (this.configService.get('NODE_ENV') === 'development') {
    console.log(`[Mock] Job post rejection email sent to ${toEmail} for job "${jobTitle}" with reason: ${reason}`);
    return;
  }

  const maxRetries = 3;
  let attempt = 1;

  while (attempt <= maxRetries) {
    try {
      console.log(`Attempt ${attempt} to send job post rejection email to ${toEmail}`);
      const baseUrl = this.configService.get<string>('BASE_URL');
      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { name: 'JobForge', email: 'support@jobforge.net' },
          to: [{ email: toEmail, name: username }],
          subject: `Your Job Post "${jobTitle}" Has Been Rejected`,
          htmlContent: `
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  * { box-sizing: border-box; }
                  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f4f7; }
                  .container { max-width: 600px; margin: 20px auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); border: 1px solid #e0e0e0; }
                  .header { text-align: center; padding: 20px 0; }
                  .header span { font-size: 28px; color: #4a90e2; font-weight: bold; }
                  .content { padding: 20px; text-align: center; }
                  .content h1 { color: #34495e; font-size: 24px; margin-bottom: 20px; }
                  .content p { color: #2c3e50; font-size: 16px; line-height: 1.6; margin-bottom: 20px; }
                  .cta-button { 
                    display: inline-block; 
                    padding: 12px 24px; 
                    background-color: #4a90e2; 
                    color: #ffffff !important; 
                    text-decoration: none; 
                    font-size: 16px; 
                    font-weight: 600; 
                    border-radius: 4px; 
                    transition: background-color 0.2s ease; 
                  }
                  .cta-button:link, .cta-button:visited, .cta-button:hover, .cta-button:active { 
                    color: #ffffff !important; 
                    text-decoration: none; 
                  }
                  .cta-button:hover { background-color: #357abd; }
                  .footer { text-align: center; padding: 20px; color: #2c3e50; font-size: 14px; }
                  .footer a { color: #4a90e2; text-decoration: none; }
                  .footer a:hover { text-decoration: underline; }
                  @media only screen and (max-width: 600px) {
                    .container { padding: 15px; margin: 10px auto; }
                    .content h1 { font-size: 20px; }
                    .content p { font-size: 14px; }
                    .cta-button { font-size: 14px; padding: 10px 20px; }
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <span>JobForge_</span>
                  </div>
                  <div class="content">
                    <h1>Dear ${username},</h1>
                    <p>Your job post titled "${jobTitle}" has been rejected.</p>
                    <p><strong>Reason for rejection:</strong> ${reason}</p>
                    <p>Please review the job post details and resubmit if necessary.</p>
                    <a href="${baseUrl}/job-posts/create" class="cta-button">Create New Job Post</a>
                    <p>If you have any questions, please contact our support team.</p>
                  </div>
                  <div class="footer">
                    <p>© 2025 JobForge. All rights reserved.</p>
                    <p><a href="https://jobforge.net/support">Contact Support</a></p>
                  </div>
                </div>
              </body>
            </html>
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
      console.log(`Job post rejection email sent to ${toEmail}:`, response.data);
      return;
    } catch (error) {
      console.error(`Attempt ${attempt} failed for ${toEmail}:`, error.message);
      if (attempt === maxRetries) {
        throw new Error(`Failed to send job post rejection email after ${maxRetries} attempts: ${error.message}`);
      }
      attempt++;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
}
}