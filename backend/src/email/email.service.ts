import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly sender: { name: string; email: string };
  private readonly brandName: string;

  constructor(private readonly config: ConfigService) {
    this.sender = {
      name: this.config.get<string>('EMAIL_FROM_NAME')!,
      email: this.config.get<string>('EMAIL_FROM_ADDRESS')!,
    };
    const base = new URL(this.config.get<string>('BASE_URL')!);
    this.brandName = this.config.get<string>('BRAND_NAME') ?? base.hostname.replace(/^www\./, '');
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  async sendVerificationEmail(
    toEmail: string,
    username: string,
    verificationToken: string,
  ): Promise<void> {
    const maxRetries = 3;
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        console.log(`Attempt ${attempt} to send verification email to ${toEmail}`);
        const verificationLink = `${this.config.get<string>('BASE_URL')!}/api/auth/verify-email?token=${verificationToken}`;

        const response = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: this.sender,
            to: [{ email: toEmail, name: username }],
            templateId: 2,
            params: {
              username,
              verificationLink,
              brandName: this.brandName,
              supportEmail: this.sender.email,
              year: new Date().getFullYear(),
            },
          },
          {
            headers: {
              'api-key': this.config.get<string>('BREVO_API_KEY')!,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        );
        console.log(`Verification email sent to ${toEmail}:`, response.data);
        return;
      } catch (error: any) {
        console.error(`Attempt ${attempt} failed for ${toEmail}:`, error.message);
        if (attempt === maxRetries) {
          throw new Error(`Failed to send verification email after ${maxRetries} attempts: ${error.message}`);
        }
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  async sendPasswordResetEmail(
    toEmail: string,
    username: string,
    resetToken: string,
  ): Promise<void> {
    const maxRetries = 3;
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        console.log(`Attempt ${attempt} to send password reset email to ${toEmail}`);
        const resetLink = `${this.config.get<string>('BASE_URL')!}/reset-password/confirm?token=${resetToken}`;

        const response = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: this.sender,
            to: [{ email: toEmail, name: username }],
            templateId: 3,
            params: {
              username,
              resetLink,
              brandName: this.brandName,
              supportEmail: this.sender.email,
              year: new Date().getFullYear(),
            },
          },
          {
            headers: {
              'api-key': this.config.get<string>('BREVO_API_KEY')!,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        );
        console.log(`Password reset email sent to ${toEmail}:`, response.data);
        return;
      } catch (error: any) {
        console.error(`Attempt ${attempt} failed for ${toEmail}:`, error.message);
        if (attempt === maxRetries) {
          throw new Error(`Failed to send password reset email after ${maxRetries} attempts: ${error.message}`);
        }
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
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
      salary_max?: number | null;
      salary_type?: 'per hour' | 'per month' | 'negotiable';
      job_type?: 'Full-time' | 'Part-time' | 'Project-based';
    },
  ): Promise<any> {
    const maxRetries = 3;
    let attempt = 1;

    const raw = this.stripHtml(jobDescriptionHtml || '');
    const cleaned = raw
      .replace(/\s+/g, ' ')
      .replace(
        /\b(Work Details|Work Mode|Salary|Job Type)\s*:.*?(?=(Work Details|Work Mode|Salary|Job Type|$))/gi,
        '',
      )
      .replace(/\s{2,}/g, ' ')
      .trim();

    const salaryDisplay =
      options?.salary_type === 'negotiable'
        ? 'Negotiable'
        : options?.salary != null && options?.salary_max != null
        ? `${options.salary}-${options.salary_max} ${
            options?.salary_type === 'per hour'
              ? 'per hour'
              : options?.salary_type === 'per month'
              ? 'per month'
              : ''
          }`.trim()
        : options?.salary != null
        ? `${options.salary} ${
            options?.salary_type === 'per hour'
              ? 'per hour'
              : options?.salary_type === 'per month'
              ? 'per month'
              : ''
          }`.trim()
        : 'Not specified';

    while (attempt <= maxRetries) {
      try {
        const response = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: this.sender,
            to: [{ email: toEmail, name: username }],
            templateId: 4,
            params: {
              username,
              jobTitle,
              jobDescription: cleaned,
              jobLink,
              location: options?.location || 'Not specified',
              jobType: options?.job_type || 'Not specified',
              salaryDisplay,
              brandName: this.brandName,
              supportEmail: this.sender.email,
              year: new Date().getFullYear(),
            },
          },
          {
            headers: {
              'api-key': this.config.get<string>('BREVO_API_KEY')!,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        );
        return response.data;
      } catch (error: any) {
        if (attempt === maxRetries) {
          throw new Error(`Failed to send job notification email after ${maxRetries} attempts: ${error.message}`);
        }
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  async sendJobPostRejectionNotification(
    toEmail: string,
    username: string,
    jobTitle: string,
    reason: string,
  ): Promise<void> {
    const maxRetries = 3;
    let attempt = 1;

    const base = this.config.get<string>('BASE_URL')!;
    const dashboardLink = base.replace(/\/api\/?$/, '') + '/employer-dashboard/post-job';

    while (attempt <= maxRetries) {
      try {
        console.log(`Attempt ${attempt} to send job post rejection email to ${toEmail}`);
        const response = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: this.sender,
            to: [{ email: toEmail, name: username }],
            templateId: 5,
            params: {
              username,
              jobTitle,
              reason,
              dashboardLink,
              brandName: this.brandName,
              supportEmail: this.sender.email,
              year: new Date().getFullYear(),
            },
          },
          {
            headers: {
              'api-key': this.config.get<string>('BREVO_API_KEY')!,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        );
        console.log(`Job post rejection email sent to ${toEmail}:`, response.data);
        return;
      } catch (error: any) {
        console.error(`Attempt ${attempt} failed for ${toEmail}:`, error.message);
        if (attempt === maxRetries) {
          throw new Error(
            `Failed to send job post rejection email after ${maxRetries} attempts: ${error.message}`,
          );
        }
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  async sendContactEmailViaTemplate(
    fromName: string,
    fromEmail: string,
    message: string,
  ): Promise<void> {
    const maxRetries = 3;
    let attempt = 1;

    const toInbox =
      this.config.get<string>('CONTACT_INBOX') || this.config.get<string>('EMAIL_FROM_ADDRESS')!;
    const templateId = 6;

    while (attempt <= maxRetries) {
      try {
        const res = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: this.sender,
            to: [{ email: toInbox, name: 'Support' }],
            replyTo: { email: fromEmail, name: fromName },
            templateId,
            params: {
              fromName,
              fromEmail,
              message,
              brandName: this.brandName,
              supportEmail: this.sender.email,
              year: new Date().getFullYear(),
            },
          },
          {
            headers: {
              'api-key': this.config.get<string>('BREVO_API_KEY')!,
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
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
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

    const base = this.config.get<string>('BASE_URL')!;
    const dashboardLink = base.replace(/\/api\/?$/, '') + '/jobseeker-dashboard/my-applications';

    while (attempt <= maxRetries) {
      try {
        console.log(`Attempt ${attempt} to send jobseeker accepted email to ${toEmail}`);
        await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: this.sender,
            to: [{ email: toEmail, name: username }],
            templateId: 7,
            params: {
              username,
              jobTitle,
              dashboardLink,
              brandName: this.brandName,
              supportEmail: this.sender.email,
              year: new Date().getFullYear(),
            },
          },
          {
            headers: {
              'api-key': this.config.get<string>('BREVO_API_KEY')!,
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
          throw new Error(
            `Failed to send jobseeker accepted email after ${maxRetries} attempts: ${error.message}`,
          );
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
    messageSnippet: string;
  }): Promise<void> {
    const maxRetries = 3;
    let attempt = 1;

    const preview = this.stripHtml(args.messageSnippet || '');
    const base = this.config.get<string>('BASE_URL')!;
    const chatLink = base.replace(/\/api\/?$/, '') + '/jobseeker-dashboard/messages';

    const templateId = Number(this.config.get<string>('BREVO_TEMPLATE_CHAT_NEW_MESSAGE') ?? 8);

    while (attempt <= maxRetries) {
      try {
        const res = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: this.sender,
            to: [{ email: args.toEmail, name: args.username }],
            templateId,
            params: {
              username: args.username,
              senderName: args.employerName,
              jobTitle: args.jobTitle,
              chatLink,
              preview,
              brandName: this.brandName,
              supportEmail: this.sender.email,
              year: new Date().getFullYear(),
            },
          },
          {
            headers: {
              'api-key': this.config.get<string>('BREVO_API_KEY')!,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        );
        console.log('Chat notification sent:', res.data);
        return;
      } catch (error: any) {
        console.error(`Attempt ${attempt} failed (chat email):`, error.message);
        if (attempt === maxRetries) throw error;
        attempt++;
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }
}