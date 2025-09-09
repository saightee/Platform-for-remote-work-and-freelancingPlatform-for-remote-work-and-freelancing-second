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
            templateId: 2, 
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
            templateId: 3,
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
    jobDescriptionHtml: string,
    jobLink: string,
    options?: {
      location?: string;
      salary?: number | null;
      salary_type?: 'per hour' | 'per month' | 'negotiable';
      job_type?: 'Full-time' | 'Part-time' | 'Project-based';
    }
  ): Promise<any> {
    const maxRetries = 3;
    let attempt = 1;

    const preview = this.stripHtml(jobDescriptionHtml).replace(/\s+/g, ' ').trim();

    const salaryDisplay =
      options?.salary_type === 'negotiable'
        ? 'Negotiable'
        : (options?.salary != null
            ? `${options.salary} ${options?.salary_type === 'per hour' ? 'per hour' : options?.salary_type === 'per month' ? 'per month' : ''}`.trim()
            : 'Not specified');

    while (attempt <= maxRetries) {
      try {
        const response = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: { name: 'JobForge', email: 'support@jobforge.net' },
            to: [{ email: toEmail, name: username }],
            templateId: 4,
            params: {
              username,
              jobTitle,
              jobDescription: preview,
              jobLink,
              location: options?.location || 'Not specified',
              jobType: options?.job_type || 'Not specified',
              salaryDisplay,
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
        return response.data;
      } catch (error: any) {
        if (attempt === maxRetries) throw new Error(`Failed to send job notification email after ${maxRetries} attempts: ${error.message}`);
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
            templateId: 5, 
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

  async sendContactEmailViaTemplate(fromName: string, fromEmail: string, message: string): Promise<void> {
    const maxRetries = 3;
    let attempt = 1;
  
    const toInbox = 'support@jobforge.net'; 
    const templateId = 6; 
  
    while (attempt <= maxRetries) {
      try {
        const res = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: { name: 'JobForge', email: toInbox },
            to: [{ email: toInbox, name: 'Support' }],
            replyTo: { email: fromEmail, name: fromName },
            templateId,
            params: { fromName, fromEmail, message },
          },
          {
            headers: {
              'api-key': this.configService.get<string>('BREVO_API_KEY'),
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        );
        console.log('Contact email sent:', res.data);
        return;
      } catch (error: any) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        if (attempt === maxRetries) {
          throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
        }
        attempt++;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  async sendJobSeekerAcceptedNotification(
    toEmail: string,
    username: string,
    jobTitle: string,
  ): Promise<void> {
    const maxRetries = 3;
    let attempt = 1;

    const base = this.configService.get<string>('BASE_URL') || 'https://jobforge.net';
    const dashboardLink = base.replace(/\/api\/?$/, '') + '/jobseeker-dashboard/my-applications';

    while (attempt <= maxRetries) {
      try {
        console.log(`Attempt ${attempt} to send jobseeker accepted email to ${toEmail}`);
        await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: { name: 'JobForge', email: 'support@jobforge.net' },
            to: [{ email: toEmail, name: username }],
            templateId: 7,
            params: {
              username,
              jobTitle,
              dashboardLink,
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
        console.log(`Jobseeker accepted email sent to ${toEmail}`);
        return;
      } catch (error: any) {
        console.error(`Attempt ${attempt} failed for ${toEmail}:`, error.message);
        if (attempt === maxRetries) {
          throw new Error(`Failed to send jobseeker accepted email after ${maxRetries} attempts: ${error.message}`);
        }
        attempt++;
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  async sendChatNewMessageNotification(args: {
    toEmail: string;
    username: string;
    employerName: string;
    jobTitle: string;
    chatLink: string;
    messageSnippet: string;
  }): Promise<void> {
    const maxRetries = 3;
    let attempt = 1;
  
    const preview = this.stripHtml ? this.stripHtml(args.messageSnippet || '') : (args.messageSnippet || '');
  
    const templateId = Number(process.env.BREVO_TEMPLATE_CHAT_NEW_MESSAGE || 8);
  
    while (attempt <= maxRetries) {
      try {
        const res = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: { name: 'JobForge', email: 'support@jobforge.net' },
            to: [{ email: args.toEmail, name: args.username }],
            templateId,
            params: {
              username: args.username,
              senderName: args.employerName,
              jobTitle: args.jobTitle,
              chatLink: args.chatLink,
              preview,
            },
          },
          {
            headers: {
              'api-key': this.configService.get<string>('BREVO_API_KEY'),
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );
        console.log('Chat notification sent:', res.data);
        return;
      } catch (error: any) {
        console.error(`Attempt ${attempt} failed (chat email):`, error.message);
        if (attempt === maxRetries) throw error;
        attempt++;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }
}