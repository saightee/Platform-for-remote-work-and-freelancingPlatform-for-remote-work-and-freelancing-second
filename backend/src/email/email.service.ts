import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) {}

  async sendVerificationEmail(toEmail: string, username: string, verificationToken: string): Promise<void> {
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
            templateId: 3, 
            params: {
              username: username,
              verificationLink: verificationLink,
            },
          },
          {
            headers: {
              'api-key': this.configService.get<string>('BREVO_API_KEY'),
              'Content-Type': 'application/json',
            },
            timeout: 15000,
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
    const maxRetries = 3;
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        console.log(`Attempt ${attempt} to send password reset email to ${toEmail}`);
        const resetLink = `${this.configService.get<string>('BASE_URL')}/reset-password/confirm?token=${resetToken}`;
        const response = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: { name: 'JobForge', email: 'support@jobforge.net' },
            to: [{ email: toEmail, name: username }],
            templateId: 4,
            params: {
              username: username,
              resetLink: resetLink,
            },
          },
          {
            headers: {
              'api-key': this.configService.get<string>('BREVO_API_KEY'),
              'Content-Type': 'application/json',
            },
            timeout: 15000,
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
  return html.replace(/<[^>]*>/g, '');
  }

  async sendJobNotification(
    toEmail: string,
    username: string,
    jobTitle: string,
    jobDescription: string,
    jobLink: string,
  ): Promise<void> {
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

  async sendJobPostRejectionNotification(
    toEmail: string,
    username: string,
    jobTitle: string,
    reason: string
  ): Promise<void> {
    const maxRetries = 3;
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        console.log(`Attempt ${attempt} to send job post rejection email to ${toEmail}`);
        const response = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: { name: 'JobForge', email: 'support@jobforge.net' },
            to: [{ email: toEmail, name: username }],
            templateId: 6, 
            params: {
              username,
              jobTitle,
              reason,
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