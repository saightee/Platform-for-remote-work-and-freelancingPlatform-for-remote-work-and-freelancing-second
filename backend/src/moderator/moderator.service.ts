import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { Review } from '../reviews/review.entity';
import { Complaint } from '../complaints/complaint.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { Employer } from '../users/entities/employer.entity';

@Injectable()
export class ModeratorService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobPost)
    private jobPostsRepository: Repository<JobPost>,
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    @InjectRepository(Complaint)
    private complaintsRepository: Repository<Complaint>,
    @InjectRepository(JobSeeker)
    private jobSeekerRepository: Repository<JobSeeker>,
    @InjectRepository(Employer)
    private employerRepository: Repository<Employer>,
  ) {}

  async checkModeratorRole(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'moderator' && user.role !== 'admin') {
      throw new UnauthorizedException('Only moderators or admins can access this resource');
    }
  }

  async approveJobPost(moderatorId: string, jobPostId: string) {
    await this.checkModeratorRole(moderatorId);
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }
    jobPost.pending_review = false;
    return this.jobPostsRepository.save(jobPost);
  }

  async flagJobPost(moderatorId: string, jobPostId: string) {
    await this.checkModeratorRole(moderatorId);
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }
    jobPost.pending_review = true;
    return this.jobPostsRepository.save(jobPost);
  }

  async getReviews(moderatorId: string) {
    await this.checkModeratorRole(moderatorId);
    return this.reviewsRepository.find({ relations: ['reviewer', 'reviewed', 'job_application'] });
  }

  async deleteReview(moderatorId: string, reviewId: string) {
    await this.checkModeratorRole(moderatorId);
    const review = await this.reviewsRepository.findOne({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.reviewsRepository.delete(reviewId);

    const reviewedUserId = review.reviewed_id;
    const reviewedUser = await this.usersRepository.findOne({ where: { id: reviewedUserId } });
    if (!reviewedUser) {
      return { message: 'Review deleted successfully' };
    }

    const reviews = await this.reviewsRepository.find({ where: { reviewed_id: reviewedUserId } });
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    if (reviewedUser.role === 'jobseeker') {
      const jobSeeker = await this.jobSeekerRepository.findOne({ where: { user_id: reviewedUserId } });
      if (jobSeeker) {
        jobSeeker.average_rating = averageRating;
        await this.jobSeekerRepository.save(jobSeeker);
      }
    } else if (reviewedUser.role === 'employer') {
      const employer = await this.employerRepository.findOne({ where: { user_id: reviewedUserId } });
      if (employer) {
        employer.average_rating = averageRating;
        await this.employerRepository.save(employer);
      }
    }

    return { message: 'Review deleted successfully' };
  }

  async getComplaints(moderatorId: string) {
    await this.checkModeratorRole(moderatorId);
    return this.complaintsRepository.find({
      relations: ['complainant', 'job_post', 'profile'],
    });
  }

  async resolveComplaint(moderatorId: string, complaintId: string, status: 'Resolved' | 'Rejected', comment?: string) {
    await this.checkModeratorRole(moderatorId);
    const complaint = await this.complaintsRepository.findOne({ where: { id: complaintId } });
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }
    complaint.status = status;
    complaint.resolution_comment = comment;
    return this.complaintsRepository.save(complaint);
  }
}