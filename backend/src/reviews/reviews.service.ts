import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewStatus } from './review.entity';
import { User } from '../users/entities/user.entity';
import { JobApplication } from '../job-applications/job-application.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { Employer } from '../users/entities/employer.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobApplication)
    private jobApplicationsRepository: Repository<JobApplication>,
    @InjectRepository(JobSeeker)
    private jobSeekerRepository: Repository<JobSeeker>,
    @InjectRepository(Employer)
    private employerRepository: Repository<Employer>,
  ) {}

  async createReview(userId: string, jobApplicationId: string, rating: number, comment?: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const jobApplication = await this.jobApplicationsRepository.findOne({
      where: { id: jobApplicationId },
      relations: ['job_post', 'job_seeker', 'job_post.employer'],
    });
    if (!jobApplication) throw new NotFoundException('Job application not found');

    if (jobApplication.status !== 'Accepted') {
      throw new BadRequestException('Reviews can only be left for accepted job applications');
    }

    let reviewed: User;
    if (user.role === 'employer') {
      if (jobApplication.job_post.employer_id !== userId) {
        throw new UnauthorizedException('You can only leave reviews for your own job applications');
      }
      reviewed = jobApplication.job_seeker;
    } else if (user.role === 'jobseeker') {
      if (jobApplication.job_seeker_id !== userId) {
        throw new UnauthorizedException('You can only leave reviews for your own job applications');
      }
      reviewed = jobApplication.job_post.employer;
    } else {
      throw new UnauthorizedException('Invalid user role');
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const existing = await this.reviewsRepository.findOne({
      where: { job_application_id: jobApplicationId, reviewer_id: userId },
    });
    if (existing) {
      throw new BadRequestException('You have already left a review for this job application');
    }

    const review = this.reviewsRepository.create({
      reviewer_id: userId,
      reviewed_id: reviewed.id,
      job_application_id: jobApplicationId,
      rating,
      comment,
      status: 'Pending',
    });

    const saved = await this.reviewsRepository.save(review);
    return saved;
  }

  async getReviewsForUser(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.reviewsRepository.find({
      where: { reviewed_id: userId, status: 'Approved' },
      relations: ['reviewer', 'job_application'],
      order: { created_at: 'DESC' },
    });
  }

  async recomputeAverageRating(userId: string) {
    const reviews = await this.reviewsRepository.find({ where: { reviewed_id: userId, status: 'Approved' } });
    const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === 'jobseeker') {
      const js = await this.jobSeekerRepository.findOne({ where: { user_id: userId } });
      if (js) {
        js.average_rating = average;
        await this.jobSeekerRepository.save(js);
      }
    } else if (user.role === 'employer') {
      const em = await this.employerRepository.findOne({ where: { user_id: userId } });
      if (em) {
        em.average_rating = average;
        await this.employerRepository.save(em);
      }
    }
  }

  async setStatus(reviewId: string, status: ReviewStatus) {
    const r = await this.reviewsRepository.findOne({ where: { id: reviewId } });
    if (!r) throw new NotFoundException('Review not found');
    r.status = status;
    await this.reviewsRepository.save(r);
    await this.recomputeAverageRating(r.reviewed_id);
    return r;
  }
}