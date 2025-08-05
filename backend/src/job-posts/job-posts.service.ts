import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPost } from './job-post.entity';
import { User } from '../users/entities/user.entity';
import { CategoriesService } from '../categories/categories.service';
import { JobApplication } from '../job-applications/job-application.entity';
import { ApplicationLimitsService } from '../application-limits/application-limits.service';
import { SettingsService } from '../settings/settings.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class JobPostsService {
  constructor(
    @InjectRepository(JobPost)
    private jobPostsRepository: Repository<JobPost>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobApplication)
    private jobApplicationsRepository: Repository<JobApplication>,
    private categoriesService: CategoriesService,
    private applicationLimitsService: ApplicationLimitsService,
    private settingsService: SettingsService,
    private configService: ConfigService, 
  ) {}

  async createJobPost(userId: string, jobPostData: { 
    title: string; 
    description: string; 
    location: string; 
    salary: number; 
    status: 'Active' | 'Draft' | 'Closed'; 
    aiBrief?: string;
    category_id?: string; 
    job_type?: 'Full-time' | 'Part-time' | 'Project-based';
    salary_type?: 'per hour' | 'per month';  
    excluded_locations?: string[];  
  }) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'employer') {
      throw new UnauthorizedException('Only employers can create job posts');
    }
  
    if (jobPostData.category_id) {
      await this.categoriesService.getCategoryById(jobPostData.category_id);
    }

    if (jobPostData.aiBrief) {
      jobPostData.description = await this.generateDescription({
        aiBrief: jobPostData.aiBrief,
        title: jobPostData.title,
        location: jobPostData.location,
        salary: jobPostData.salary,
        salary_type: jobPostData.salary_type,
        job_type: jobPostData.job_type,
      });
    }
  
    const limitObj = await this.settingsService.getGlobalApplicationLimit();
    let globalLimit = limitObj.globalApplicationLimit;
    if (!Number.isFinite(globalLimit) || globalLimit < 0) {
      globalLimit = 100; 
    }
  
    const jobPost = this.jobPostsRepository.create({
      ...jobPostData,
      employer_id: userId,
      pending_review: true,
    });
    const savedJobPost = await this.jobPostsRepository.save(jobPost);
  
    await this.applicationLimitsService.initializeLimits(savedJobPost.id, globalLimit);
  
    return savedJobPost;
  }
  
  async updateJobPost(userId: string, jobPostId: string, updates: { 
    title?: string; 
    description?: string; 
    location?: string; 
    salary?: number; 
    status?: 'Active' | 'Draft' | 'Closed'; 
    category_id?: string; 
    aiBrief?: string;
    job_type?: 'Full-time' | 'Part-time' | 'Project-based';
    salary_type?: 'per hour' | 'per month';  
    excluded_locations?: string[];  
  }) {
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId, employer_id: userId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found or you do not have permission to update it');
    }
  
    if (updates.category_id) {
      await this.categoriesService.getCategoryById(updates.category_id);
    }

    if (updates.aiBrief) {
      updates.description = await this.generateDescription({
        aiBrief: updates.aiBrief,
        title: updates.title || jobPost.title,
        location: updates.location || jobPost.location,
        salary: updates.salary !== undefined ? updates.salary : jobPost.salary,
        salary_type: updates.salary_type || jobPost.salary_type,
        job_type: updates.job_type || jobPost.job_type,
      });
    }
  
    if (updates.title) jobPost.title = updates.title;
    if (updates.description) jobPost.description = updates.description;
    if (updates.location) jobPost.location = updates.location;
    if (updates.salary) jobPost.salary = updates.salary;
    if (updates.status) jobPost.status = updates.status;
    if (updates.category_id) jobPost.category_id = updates.category_id;
    if (updates.job_type) jobPost.job_type = updates.job_type;
    if (updates.salary_type) jobPost.salary_type = updates.salary_type;  
    if (updates.excluded_locations) jobPost.excluded_locations = updates.excluded_locations;  
  
    return this.jobPostsRepository.save(jobPost);
  }

  async getJobPost(jobPostId: string) {
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId }, relations: ['employer', 'category'] });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }
    return jobPost;
  }

  async getJobPostsByEmployer(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'employer') {
      throw new UnauthorizedException('Only employers can view their job posts');
    }

    const jobPosts = await this.jobPostsRepository.find({
      where: { employer_id: userId },
      relations: ['category'],
    });

    console.log('Job Posts:', JSON.stringify(jobPosts, null, 2));
    return jobPosts;
  }

  async searchJobPosts(filters: {
    title?: string;
    location?: string;
    job_type?: 'Full-time' | 'Part-time' | 'Project-based';
    salary_min?: number;
    salary_max?: number;
    category_id?: string;
    required_skills?: string[];
    page?: number;
    limit?: number;
    sort_by?: 'created_at' | 'salary';
    sort_order?: 'ASC' | 'DESC';
    salary_type?: 'per hour' | 'per month';  
  }) {
    const query = this.jobPostsRepository.createQueryBuilder('jobPost')
      .leftJoinAndSelect('jobPost.employer', 'employer')
      .leftJoinAndSelect('jobPost.category', 'category')
      .where('jobPost.status = :status', { status: 'Active' })
      .andWhere('jobPost.pending_review = :pendingReview', { pendingReview: false });

    if (filters.title) {
      query.andWhere('jobPost.title ILIKE :title', { title: `%${filters.title}%` });
    }
    if (filters.location) {
      query.andWhere('jobPost.location ILIKE :location', { location: `%${filters.location}%` });
    }
    if (filters.job_type) {
      query.andWhere('jobPost.job_type = :job_type', { job_type: filters.job_type });
    }
    if (filters.salary_min) {
      query.andWhere('jobPost.salary >= :salary_min', { salary_min: filters.salary_min });
    }
    if (filters.salary_max) {
      query.andWhere('jobPost.salary <= :salary_max', { salary_max: filters.salary_max });
    }
    if (filters.category_id) {
      query.andWhere('jobPost.category_id = :category_id', { category_id: filters.category_id });
    }
    if (filters.required_skills && filters.required_skills.length > 0) {
      query.andWhere('jobPost.required_skills && :required_skills', { required_skills: filters.required_skills });
    }
    if (filters.salary_type) { 
      query.andWhere('jobPost.salary_type = :salary_type', { salary_type: filters.salary_type });
    }

    const total = await query.getCount();

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order || 'DESC';
    query.orderBy(`jobPost.${sortBy}`, sortOrder);

    const jobPosts = await query.getMany();

    return {
      total,
      data: jobPosts,
    };
  }

  async applyToJob(userId: string, jobPostId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== 'jobseeker') {
      throw new UnauthorizedException('Only jobseekers can apply to job posts');
    }

    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }
    if (jobPost.status !== 'Active') {
      throw new BadRequestException('Cannot apply to a job post that is not active');
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

    const application = this.jobApplicationsRepository.create({
      job_post_id: jobPostId,
      job_seeker_id: userId,
      status: 'Pending',
    });
    const savedApplication = await this.jobApplicationsRepository.save(application);

    await this.applicationLimitsService.incrementApplicationCount(jobPostId);

    return savedApplication;
  }

  async closeJobPost(userId: string, jobPostId: string) {
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId, employer_id: userId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found or you do not have permission to close it');
    }
    if (jobPost.status === 'Closed') {
      throw new BadRequestException('Job post is already closed');
    }

    jobPost.status = 'Closed';
    return this.jobPostsRepository.save(jobPost);
  }

  async incrementJobView(jobPostId: string) {
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId } });
    if (!jobPost) {
      throw new NotFoundException('Job post not found');
    }
    jobPost.views = (jobPost.views || 0) + 1;
    await this.jobPostsRepository.save(jobPost);
    return { message: 'View count incremented', views: jobPost.views };
  }

  async generateDescription(data: {
    aiBrief: string;
    title?: string;
    location?: string;
    salary?: number;
    salary_type?: 'per hour' | 'per month';
    job_type?: 'Full-time' | 'Part-time' | 'Project-based';
  }): Promise<string> {
    if (!data.aiBrief) {
      throw new BadRequestException('AI brief is required for description generation');
    }
    const apiKey = this.configService.get<string>('XAI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('xAI API key is not configured');
    }
    const prompt = `
      Generate a professional job description in English based solely on the provided brief: "${data.aiBrief}".
      Do NOT add any fictional details (e.g., company names, team sizes, benefits, or unspecified information).
      Use the exact details provided below for the job. Structure the description with markdown:
      - Use ## for section headers.
      - Use - for bullet points in lists.
      - Add an empty line between sections for readability.
      - Keep the total length between 150-180 words.
      - Ensure the markdown is simple, HTML-compatible, and suitable for rendering in ReactQuill rich text editor.
      - Use standard markdown (e.g., no tables, no complex nested elements, no extra line breaks within lists) to avoid rendering issues in ReactQuill.
      - Do NOT include a word count or concluding remarks (e.g., no "Apply today" or "Join us").

      **Structure**:
      One sentence summarizing the role based on the brief and title.

      ## Responsibilities
      - List 3-5 key duties extracted directly from the brief.

      ## Requirements
      - List 3-5 skills or qualifications from the brief.

      ## Work Details
      - **Work Mode**: ${data.location || 'Not specified'}
      - **Salary**: ${data.salary ? `${data.salary} ${data.salary_type || ''}` : 'Not specified'}
      - **Job Type**: ${data.job_type || 'Not specified'}

      **Provided Details**:
      - Job Title: ${data.title || 'Not specified'}
      - Brief: ${data.aiBrief}
    `;

  try {
      const response = await axios.post('https://api.x.ai/v1/chat/completions', {
        model: 'grok-3-mini',
        messages: [{ role: 'user', content: prompt }],
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('xAI response:', response.data);

      const markdownContent = response.data.choices[0].message.content.trim();
      console.log('markdownContent:', markdownContent); 
      const htmlContent = await marked.parse(markdownContent);
      console.log('htmlContent:', htmlContent); 
      const sanitizedHtml = sanitizeHtml(htmlContent, {
        allowedTags: ['h2', 'ul', 'li', 'p', 'strong', 'em'],
        allowedAttributes: {},
      });
      console.log('sanitizedHtml:', sanitizedHtml); 

      return sanitizedHtml;
    } catch (error) {
      console.error('xAI API Error:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to generate description with AI');
    }
  }
}