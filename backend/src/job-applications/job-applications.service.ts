import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JobApplication } from './job-application.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { User } from '../users/entities/user.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { ApplicationLimitsService } from '../application-limits/application-limits.service';
import { Server } from 'socket.io';
import { Inject } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { ReferralLink } from '../referrals/entities/referral-link.entity';
import { ChatService } from '../chat/chat.service';
import { JobInvitation } from './job-invitation.entity';

@Injectable()
export class JobApplicationsService {
  constructor(
    @InjectRepository(JobInvitation)
    private jobInvitationsRepository: Repository<JobInvitation>,
    @InjectRepository(JobApplication)
    private jobApplicationsRepository: Repository<JobApplication>,
    @InjectRepository(JobPost)
    private jobPostsRepository: Repository<JobPost>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(ReferralLink) private referralLinksRepository: Repository<ReferralLink>,
    @InjectRepository(JobSeeker)
    private jobSeekerRepository: Repository<JobSeeker>,
    private applicationLimitsService: ApplicationLimitsService,
    @Inject('SOCKET_IO_SERVER') private server: Server,
    private emailService: EmailService, 
    private chatService: ChatService,
  ) {}

  async applyToJob(
    userId: string,
    jobPostId: string,
    coverLetter: string,
    relevantExperience: string,
    fullName?: string,
    referredBy?: string,
    refCode?: string,
  ) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'jobseeker') {
      throw new UnauthorizedException('Only jobseekers can apply to job posts');
    }

    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) throw new NotFoundException('Job post not found');
    if (jobPost.status !== 'Active') {
      throw new BadRequestException('Cannot apply to a job post that is not active');
    }

    if (jobPost.excluded_locations?.includes(user.country)) {
      throw new BadRequestException('Applicants from your location are not allowed');
    }

    const existingApplication = await this.jobApplicationsRepository.findOne({
      where: { job_post_id: jobPostId, job_seeker_id: userId },
    });
    if (existingApplication) {
      throw new BadRequestException('You have already applied to this job post');
    }

    const { canApply, message } = await this.applicationLimitsService.canApply(jobPostId);
    if (!canApply) {
      throw new BadRequestException(message || 'Cannot apply to this job post');
    }

    if (!coverLetter || !coverLetter.trim()) {
      throw new BadRequestException('Cover letter is required');
    }
    if (!relevantExperience || !relevantExperience.trim()) {
      throw new BadRequestException('Relevant experience is required');
    }

    let referralLink: ReferralLink | null = null;
    if (refCode) {
      referralLink = await this.referralLinksRepository.findOne({
        where: { ref_code: refCode },
        relations: ['job_post'],
      });
      if (!referralLink || referralLink.job_post?.id !== jobPostId) {
        referralLink = null;
      }
    }

    const application = this.jobApplicationsRepository.create({
      job_post_id: jobPostId,
      job_seeker_id: userId,
      status: 'Pending',
      cover_letter: coverLetter.trim(),
      relevant_experience: relevantExperience.trim(),
      full_name: fullName?.trim() || null,
      referred_by: referredBy?.trim() || null,
      referral_link_id: referralLink?.id || null,
    });

    const saved = await this.jobApplicationsRepository.save(application);
    await this.applicationLimitsService.incrementApplicationCount(jobPostId);

    const parts: string[] = [];
    parts.push(`Why I'm a good fit:\n${coverLetter.trim()}`);
    parts.push(`\n\nRelevant experience:\n${relevantExperience.trim()}`);
    if (fullName?.trim()) parts.push(`\n\nFull name: ${fullName.trim()}`);
    if (referredBy?.trim()) parts.push(`\nReferred by: ${referredBy.trim()}`);
    const initialText = parts.join('');

    try {
      const msg = await this.chatService.createMessage(userId, saved.id, initialText);

      const chatRoom = `chat:${saved.id}`;
      const recipientRoom = `user:${msg.recipient_id}`;
      this.server.to(chatRoom).emit('newMessage', msg);
      this.server.to(recipientRoom).except(chatRoom).emit('newMessage', msg);
    } catch (e) {
      console.error('Failed to send initial chat message for application', saved.id, e);
    }

    return saved;
  }

  async getMyApplications(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'jobseeker') {
      return [];
    }

    return this.jobApplicationsRepository.find({
      where: { job_seeker_id: userId },
      relations: ['job_post', 'job_post.employer', 'job_seeker'], 
    });
  }

  async getApplicationsForJobPost(userId: string, jobPostId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (['admin', 'moderator'].includes(user.role)) {
      const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
      if (!jobPost) throw new NotFoundException('Job post not found');
    } else {
      if (user.role !== 'employer') {
        throw new UnauthorizedException('Only employers can view applications for their job posts');
      }
      const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId, employer_id: userId } });
      if (!jobPost) {
        throw new NotFoundException('Job post not found or you do not have permission to view its applications');
      }
    }

    const applications = await this.jobApplicationsRepository.find({
      where: { job_post_id: jobPostId },
      relations: ['job_seeker'],
    });

    const result = await Promise.all(
      applications.map(async (app) => {
        const jobSeeker = await this.jobSeekerRepository.findOne({
          where: { user_id: app.job_seeker_id },
        });
        const userData = app.job_seeker;
        if (!userData) return null;

        const applicantCountry = (userData.country || '').trim().toUpperCase() || null;

        return {
          applicationId: app.id,
          userId: userData.id,
          username: userData.username,
          email: userData.email,
          jobDescription: jobSeeker?.experience || '',
          details: {
            fullName: app.full_name || null,
            referredBy: app.referred_by || null,
            coverLetter: app.cover_letter || '',
          },
          appliedAt: app.created_at.toISOString(),
          status: app.status,
          job_post_id: app.job_post_id,
          applicant_country: applicantCountry,
          applicant_country_code: applicantCountry,
          applicant_date_of_birth: (jobSeeker as any)?.date_of_birth || null,
        };
      }),
    );
    return result.filter(Boolean);
  }

  async updateApplicationStatus(
    userId: string,
    applicationId: string,
    status: 'Pending' | 'Accepted' | 'Rejected',
  ) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'employer') {
      throw new UnauthorizedException('Only employers can update application status');
    }

    const application = await this.jobApplicationsRepository.findOne({
      where: { id: applicationId },
      relations: ['job_post', 'job_seeker'],
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    if (application.job_post.employer_id !== userId) {
      throw new UnauthorizedException('You do not have permission to update this application');
    }

    if (status === 'Accepted') {
      await this.jobApplicationsRepository.update({ id: application.id }, { status: 'Accepted' });

      const updated = await this.jobApplicationsRepository.findOne({
        where: { id: application.id },
        relations: ['job_post', 'job_seeker'],
      });

      try {
        if (updated?.job_seeker?.email && updated?.job_seeker?.username && updated?.job_post?.title) {
          await this.emailService.sendJobSeekerAcceptedNotification(
            updated.job_seeker.email,
            updated.job_seeker.username,
            updated.job_post.title,
          );
        }
      } catch (e) {
        console.error('Failed to send acceptance email:', (e as Error).message);
      }

      return updated;
    }

    application.status = status;
    return this.jobApplicationsRepository.save(application);
  }

  async getApplicationById(userId: string, applicationId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!['employer', 'admin', 'moderator'].includes(user.role)) {
      throw new UnauthorizedException('Only employers, admins, or moderators can view application details');
    }
    const application = await this.jobApplicationsRepository.findOne({
      where: { id: applicationId },
      relations: ['job_post', 'job_seeker'],
    });
    if (!application) throw new NotFoundException('Application not found');
    if (user.role === 'employer' && application.job_post.employer_id !== userId) {
      throw new UnauthorizedException('You do not have permission to view this application');
    }
    const jobSeeker = await this.jobSeekerRepository.findOne({
      where: { user_id: application.job_seeker_id },
    });
    const applicantCountry = (application.job_seeker?.country || '').trim().toUpperCase() || null;
    return {
      applicationId: application.id,
      userId: application.job_seeker_id,
      username: application.job_seeker.username,
      email: application.job_seeker.email,
      jobDescription: jobSeeker?.experience || '',
      coverLetter: application.cover_letter,
      appliedAt: application.created_at.toISOString(),
      status: application.status,
      job_post_id: application.job_post_id,
      job_post: {
        id: application.job_post.id,
        title: application.job_post.title,
        status: application.job_post.status,
      },
      applicant_date_of_birth: (jobSeeker as any)?.date_of_birth || null,
      applicant_country: applicantCountry,
      applicant_country_code: applicantCountry,
    };
  }

  async inviteJobSeeker(
    employerId: string,
    jobPostId: string,
    jobSeekerId: string,
    message?: string,
  ) {
    const employer = await this.usersRepository.findOne({ where: { id: employerId } });
    if (!employer) throw new NotFoundException('User not found');
    if (employer.role !== 'employer') {
      throw new UnauthorizedException('Only employers can send invitations');
    }

    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId, employer_id: employerId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found or you do not have permission to invite for it');
    }
    if (jobPost.status !== 'Active' || jobPost.pending_review) {
      throw new BadRequestException('You can invite only for active and approved job posts');
    }
    if (jobPost.employer_id === jobSeekerId) {
      throw new BadRequestException('Cannot invite yourself');
    }

    const jobSeeker = await this.usersRepository.findOne({ where: { id: jobSeekerId } });
    if (!jobSeeker || jobSeeker.role !== 'jobseeker') {
      throw new NotFoundException('Jobseeker not found');
    }

    const alreadyApplied = await this.jobApplicationsRepository.findOne({
      where: { job_post_id: jobPostId, job_seeker_id: jobSeekerId },
    });
    if (alreadyApplied) {
      throw new BadRequestException('Candidate has already applied to this job');
    }

    let invite = await this.jobInvitationsRepository.findOne({
      where: { job_post_id: jobPostId, job_seeker_id: jobSeekerId },
    });

    if (invite && invite.status === 'Pending') {
      return invite;
    }

    if (!invite) {
      invite = this.jobInvitationsRepository.create({
        job_post_id: jobPostId,
        employer_id: employerId,
        job_seeker_id: jobSeekerId,
        status: 'Pending',
        message: message?.trim() || null,
      });
    } else {
      invite.status = 'Pending';
      invite.message = message?.trim() || null;
    }

    const saved = await this.jobInvitationsRepository.save(invite);

    return saved;
  }

  async getMyInvitations(jobSeekerId: string, includeAll = false) {
    const user = await this.usersRepository.findOne({ where: { id: jobSeekerId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'jobseeker') return [];

    const where = includeAll ? { job_seeker_id: jobSeekerId } : { job_seeker_id: jobSeekerId, status: 'Pending' as const };
    const rows = await this.jobInvitationsRepository.find({
      where,
      relations: ['job_post', 'job_post.employer', 'employer'],
      order: { created_at: 'DESC' },
    });

    return rows.map(r => ({
      id: r.id,
      status: r.status,
      message: r.message || null,
      created_at: r.created_at,
      job_post: r.job_post ? {
        id: r.job_post.id,
        title: r.job_post.title,
        location: r.job_post.location,
        salary: r.job_post.salary,
        salary_type: r.job_post.salary_type,
        job_type: r.job_post.job_type,
        slug: r.job_post.slug,
        slug_id: r.job_post.slug_id,
        employer: r.job_post.employer ? {
          id: r.job_post.employer.id,
          username: r.job_post.employer.username,
        } : null,
      } : null,
      employer: r.employer ? { id: r.employer.id, username: r.employer.username } : null,
    }));
  }

  async declineInvitation(jobSeekerId: string, invitationId: string) {
    const user = await this.usersRepository.findOne({ where: { id: jobSeekerId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'jobseeker') throw new UnauthorizedException('Only jobseekers can decline invitations');

    const invite = await this.jobInvitationsRepository.findOne({
      where: { id: invitationId },
      relations: ['job_post'],
    });
    if (!invite || invite.job_seeker_id !== jobSeekerId) {
      throw new NotFoundException('Invitation not found');
    }
    if (invite.status !== 'Pending') return invite;

    invite.status = 'Declined';
    return this.jobInvitationsRepository.save(invite);
  }

  async acceptInvitation(
    jobSeekerId: string,
    invitationId: string,
    {
      cover_letter,
      relevant_experience,
      full_name,
      referred_by,
    }: {
      cover_letter: string;
      relevant_experience: string;
      full_name?: string;
      referred_by?: string;
    },
  ) {
    const user = await this.usersRepository.findOne({ where: { id: jobSeekerId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'jobseeker') throw new UnauthorizedException('Only jobseekers can accept invitations');

    const invite = await this.jobInvitationsRepository.findOne({
      where: { id: invitationId },
      relations: ['job_post'],
    });
    if (!invite || invite.job_seeker_id !== jobSeekerId) {
      throw new NotFoundException('Invitation not found');
    }
    if (invite.status !== 'Pending') {
      throw new BadRequestException('Invitation is not pending');
    }

    const jobPostId = invite.job_post_id;

    const alreadyApplied = await this.jobApplicationsRepository.findOne({
      where: { job_post_id: jobPostId, job_seeker_id: jobSeekerId },
    });
    if (alreadyApplied) {
      invite.status = 'Accepted';
      await this.jobInvitationsRepository.save(invite);
      return alreadyApplied;
    }

    const app = await this.applyToJob(
      jobSeekerId,
      jobPostId,
      cover_letter,
      relevant_experience,
      full_name,
      referred_by,
    );

    invite.status = 'Accepted';
    await this.jobInvitationsRepository.save(invite);

    return app;
  }

  async bulkRejectApplications(
    employerId: string,
    applicationIds: string[],
  ): Promise<{ updated: number; updatedIds: string[] }> {
    const user = await this.usersRepository.findOne({ where: { id: employerId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'employer') {
      throw new UnauthorizedException('Only employers can update application status');
    }

    const apps = await this.jobApplicationsRepository.find({
      where: { id: In([...new Set(applicationIds)]) },
      relations: ['job_post'],
    });
    if (!apps.length) return { updated: 0, updatedIds: [] };

    const targets = apps.filter(
      a => a.job_post?.employer_id === employerId && a.status === 'Pending',
    );
    const ids = targets.map(a => a.id);
    if (!ids.length) return { updated: 0, updatedIds: [] };

    await this.jobApplicationsRepository.update({ id: In(ids) }, { status: 'Rejected' });
    return { updated: ids.length, updatedIds: ids };
  }

}