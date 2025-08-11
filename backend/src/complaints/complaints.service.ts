import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Complaint } from './complaint.entity';
import { User } from '../users/entities/user.entity';
import { JobPost } from '../job-posts/job-post.entity';

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(Complaint)
    private complaintsRepository: Repository<Complaint>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobPost)
    private jobPostsRepository: Repository<JobPost>,
  ) {}

  async createComplaint(
    complainantId: string,
    jobPostId: string | null,
    profileId: string | null,
    reason: string,
  ) {
    const complainant = await this.usersRepository.findOne({ where: { id: complainantId } });
    if (!complainant) {
      throw new NotFoundException('Complainant not found');
    }
    if (complainant.role !== 'jobseeker' && complainant.role !== 'employer') {
      throw new UnauthorizedException('Only jobseekers and employers can submit complaints');
    }

    if (!jobPostId && !profileId) {
      throw new BadRequestException('Either job_post_id or profile_id must be provided');
    }
    if (jobPostId && profileId) {
      throw new BadRequestException('Only one of job_post_id or profile_id can be provided');
    }

    if (jobPostId) {
      const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
      if (!jobPost) {
        throw new NotFoundException('Job post not found');
      }
    } else if (profileId) {
      const profile = await this.usersRepository.findOne({ where: { id: profileId } });
      if (!profile) {
        throw new NotFoundException('Profile not found');
      }
      if (complainantId === profileId) {
        throw new BadRequestException('Cannot submit a complaint against your own profile');
      }
    }

    const existingComplaint = await this.complaintsRepository.findOne({
      where: {
        complainant_id: complainantId,
        job_post_id: jobPostId || undefined,
        profile_id: profileId || undefined,
        status: 'Pending',
      },
    });
    if (existingComplaint) {
      throw new BadRequestException('You have already submitted a pending complaint for this target');
    }

    const complaint = this.complaintsRepository.create({
      complainant_id: complainantId,
      job_post_id: jobPostId,
      profile_id: profileId,
      reason,
      status: 'Pending',
    } as Partial<Complaint>);

    return this.complaintsRepository.save(complaint);
  }

  async getComplaints(adminId: string) {
    const admin = await this.usersRepository.findOne({ where: { id: adminId } });
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedException('Only admins can view complaints');
    }

    return this.complaintsRepository.find({
      relations: ['complainant', 'job_post', 'profile', 'resolver'],
    });
  }

  async resolveComplaint(adminId: string, complaintId: string, status: 'Resolved' | 'Rejected', comment?: string) {
    const admin = await this.usersRepository.findOne({ where: { id: adminId } });
    if (!admin || admin.role !== 'admin') {
      throw new UnauthorizedException('Only admins can resolve complaints');
    }

    const complaint = await this.complaintsRepository.findOne({ where: { id: complaintId } });
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    complaint.status = status;
    complaint.resolution_comment = comment;
    complaint.resolver_id = adminId;

    return this.complaintsRepository.save(complaint);
  }
}