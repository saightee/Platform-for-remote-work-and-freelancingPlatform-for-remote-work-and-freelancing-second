import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
import { randomBytes } from 'crypto';
import { JobPostCategory } from './job-post-category.entity';

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

  private slugify(input: string): string {
    return (input || '')
      .toLowerCase()
      .trim()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  private async setJobCategories(jobPostId: string, categoryIds: string[] | undefined) {
    if (!categoryIds) return;

    await this.jobPostsRepository.manager
      .createQueryBuilder()
      .delete()
      .from(JobPostCategory)
      .where('job_post_id = :id', { id: jobPostId })
      .execute();

    const unique = Array.from(new Set(categoryIds.filter(Boolean)));
    if (unique.length) {
      const rows = unique.map((cid) => {
        const jpc = new JobPostCategory();
        jpc.job_post_id = jobPostId;
        jpc.category_id = cid;
        return jpc;
      });
      await this.jobPostsRepository.manager.save(rows);
    }

    const legacy = unique.length ? unique[0] : null;
    await this.jobPostsRepository.update({ id: jobPostId }, { category_id: legacy });
  }

  async createJobPost(
    userId: string,
    jobPostData: {
      title: string;
      description?: string;
      location: string;
      salary?: number;
      status: 'Active' | 'Draft' | 'Closed';
      aiBrief?: string;
      category_id?: string;
      category_ids?: string[];
      job_type?: 'Full-time' | 'Part-time' | 'Project-based';
      salary_type?: 'per hour' | 'per month' | 'negotiable';
      excluded_locations?: string[];
    }
  ) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'employer') throw new UnauthorizedException('Only employers can create job posts');

    const incomingIds = jobPostData.category_ids?.length
      ? jobPostData.category_ids
      : (jobPostData.category_id ? [jobPostData.category_id] : []);

    if (incomingIds.length) {
      const found = await this.categoriesService.findManyByIds(incomingIds);
      if (found.length !== incomingIds.length) {
        throw new BadRequestException('One or more categories not found');
      }
    }

    if (jobPostData.salary_type !== 'negotiable' && !jobPostData.salary) {
      throw new BadRequestException('Salary is required unless salary_type is negotiable');
    }
    if (jobPostData.salary_type === 'negotiable') jobPostData.salary = null;

    if (!jobPostData.description && jobPostData.aiBrief) {
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
    if (!Number.isFinite(globalLimit) || globalLimit < 0) globalLimit = 100;

    const jobPost = this.jobPostsRepository.create({
      title: jobPostData.title,
      description: jobPostData.description!,
      location: jobPostData.location,
      salary: jobPostData.salary ?? null,
      salary_type: jobPostData.salary_type,
      status: jobPostData.status,
      job_type: jobPostData.job_type,
      excluded_locations: jobPostData.excluded_locations,
      employer_id: userId,
      pending_review: true,
    });

    const saved = await this.jobPostsRepository.save(jobPost);

    const baseSlug = this.slugify(saved.title || '');
    const shortId = (saved.id || '').replace(/-/g, '').slice(0, 8);
    saved.slug = baseSlug || null;
    saved.slug_id = baseSlug && shortId ? `${baseSlug}--${shortId}` : null;
    await this.jobPostsRepository.save(saved);

    await this.applicationLimitsService.initializeLimits(saved.id, globalLimit);

    await this.setJobCategories(saved.id, incomingIds);

    return this.getJobPost(saved.id);
  }

  async updateJobPost(
    userId: string,
    jobPostId: string,
    updates: {
      title?: string;
      description?: string;
      location?: string;
      salary?: number;
      status?: 'Active' | 'Draft' | 'Closed';
      category_id?: string;
      category_ids?: string[];
      aiBrief?: string;
      job_type?: 'Full-time' | 'Part-time' | 'Project-based';
      salary_type?: 'per hour' | 'per month' | 'negotiable';
      excluded_locations?: string[];
    }
  ) {
    const jobPost = await this.jobPostsRepository.findOne({ where: { id: jobPostId, employer_id: userId } });
    if (!jobPost) throw new NotFoundException('Job post not found or you do not have permission to update it');

    if (updates.status === 'Closed') {
      throw new BadRequestException('Use Close Job endpoint to close a job post');
    }

    const incomingIds = updates.category_ids?.length
      ? updates.category_ids
      : (updates.category_id ? [updates.category_id] : undefined);
    if (incomingIds) {
      const found = await this.categoriesService.findManyByIds(incomingIds);
      if (found.length !== incomingIds.length) {
        throw new BadRequestException('One or more categories not found');
      }
    }

    const effectiveSalaryType = updates.salary_type ?? jobPost.salary_type;
    if (effectiveSalaryType === 'negotiable') {
      jobPost.salary = null;
    } else if (updates.salary === undefined && jobPost.salary === null) {
      throw new BadRequestException('Salary is required unless salary_type is negotiable');
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

    const titleChanged = !!updates.title && updates.title !== jobPost.title;
    if (updates.title) jobPost.title = updates.title;
    if (updates.description) jobPost.description = updates.description;
    if (updates.location) jobPost.location = updates.location;
    if (updates.salary !== undefined) jobPost.salary = updates.salary;
    if (updates.status) jobPost.status = updates.status;
    if (updates.job_type) jobPost.job_type = updates.job_type;
    if (updates.salary_type) jobPost.salary_type = updates.salary_type;
    if (updates.excluded_locations) jobPost.excluded_locations = updates.excluded_locations;

    if (titleChanged) {
      const baseSlug = this.slugify(jobPost.title || '');
      const shortId = (jobPost.id || '').replace(/-/g, '').slice(0, 8);
      jobPost.slug = baseSlug || null;
      jobPost.slug_id = baseSlug && shortId ? `${baseSlug}--${shortId}` : null;
    }

    await this.jobPostsRepository.save(jobPost);

    if (incomingIds) {
      await this.setJobCategories(jobPost.id, incomingIds);
    }

    return this.getJobPost(jobPost.id);
  }

  async getBySlugOrId(slugOrId: string) {
    let post = await this.jobPostsRepository.findOne({ where: { slug_id: slugOrId } });
    if (!post) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(slugOrId)) {
        post = await this.jobPostsRepository.findOne({ where: { id: slugOrId } });
      }
    }
    if (!post) throw new NotFoundException('Job post not found');

    return this.getJobPost(post.id);
  }

  async getJobPost(jobPostId: string) {
    const jobPost = await this.jobPostsRepository.findOne({
      where: { id: jobPostId },
      relations: ['employer'],
    });
    if (!jobPost) throw new NotFoundException('Job post not found');

    const rows = await this.jobPostsRepository.manager.find(JobPostCategory, {
      where: { job_post_id: jobPostId },
      relations: ['category'],
    });
    const categories = rows.map(r => ({ id: r.category_id, name: r.category?.name }));

    return {
      ...jobPost,
      category_id: jobPost.category_id ?? null,
      categories,
      category_ids: categories.map(c => c.id),
    };
  }

  async getJobPostsByEmployer(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'employer') throw new UnauthorizedException('Only employers can view their job posts');

    const posts = await this.jobPostsRepository.find({
      where: { employer_id: userId },
      order: { created_at: 'DESC' },
    });

    const ids = posts.map(p => p.id);
    const jpcs = ids.length
      ? await this.jobPostsRepository.manager.find(JobPostCategory, {
          where: { job_post_id: In(ids) },
          relations: ['category'],
        })
      : [];

    const byPost = new Map<string, { id: string; name?: string }[]>();
    jpcs.forEach(row => {
      const arr = byPost.get(row.job_post_id) || [];
      arr.push({ id: row.category_id, name: row.category?.name });
      byPost.set(row.job_post_id, arr);
    });

    return posts.map(p => {
      const cats = byPost.get(p.id) || [];
      return {
        ...p,
        category_id: p.category_id ?? null,
        categories: cats,
        category_ids: cats.map(c => c.id),
      };
    });
  }

  async searchJobPosts(filters: {
    title?: string;
    location?: string;
    job_type?: 'Full-time' | 'Part-time' | 'Project-based';
    salary_min?: number;
    salary_max?: number;
    category_id?: string;
    category_ids?: string[];
    required_skills?: string[];
    page?: number;
    limit?: number;
    sort_by?: 'created_at' | 'salary';
    sort_order?: 'ASC' | 'DESC';
    salary_type?: 'per hour' | 'per month' | 'negotiable';
  }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const offset = (page - 1) * limit;

    const qb = this.jobPostsRepository
      .createQueryBuilder('jp')
      .where('jp.status = :st', { st: 'Active' })
      .andWhere('jp.pending_review = :pr', { pr: false });

    if (filters.title) qb.andWhere('jp.title ILIKE :title', { title: `%${filters.title}%` });
    if (filters.location) qb.andWhere('jp.location ILIKE :loc', { loc: `%${filters.location}%` });
    if (filters.job_type) qb.andWhere('jp.job_type = :jt', { jt: filters.job_type });
    if (filters.salary_type) qb.andWhere('jp.salary_type = :stp', { stp: filters.salary_type });

    if (Number.isFinite(filters.salary_min)) qb.andWhere('jp.salary >= :smin', { smin: filters.salary_min });
    if (Number.isFinite(filters.salary_max)) qb.andWhere('jp.salary <= :smax', { smax: filters.salary_max });

    const catIds = filters.category_ids?.length
      ? filters.category_ids
      : (filters.category_id ? [filters.category_id] : []);

    if (catIds.length) {
      qb.innerJoin('job_post_categories', 'jpc', 'jpc.job_post_id = jp.id')
        .andWhere('jpc.category_id = ANY(:catIds)', { catIds });
    }

    if (filters.required_skills?.length) {
      qb.andWhere('(jp.required_skills && :skills)', { skills: filters.required_skills });
    }

    const sortBy = filters.sort_by ?? 'created_at';
    const sortOrder = filters.sort_order ?? 'DESC';
    qb.orderBy(`jp.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    const [rows, total] = await qb.distinct(true).offset(offset).limit(limit).getManyAndCount();

    const ids = rows.map(r => r.id);
    const jpcs = ids.length
      ? await this.jobPostsRepository.manager.find(JobPostCategory, {
          where: { job_post_id: In(ids) },
          relations: ['category'],
        })
      : [];

    const byPost = new Map<string, { id: string; name?: string }[]>();
    jpcs.forEach(row => {
      const arr = byPost.get(row.job_post_id) || [];
      arr.push({ id: row.category_id, name: row.category?.name });
      byPost.set(row.job_post_id, arr);
    });

    const data = rows.map(r => {
      const cats = byPost.get(r.id) || [];
      return {
        ...r,
        category_id: r.category_id ?? null,
        categories: cats,
        category_ids: cats.map(c => c.id),
      };
    });

    return { total, data };
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
    if (!jobPost) throw new NotFoundException('Job post not found or you do not have permission to close it');
    if (jobPost.status === 'Closed') throw new BadRequestException('Job post is already closed');

    await this.jobPostsRepository.manager.transaction(async (trx) => {
      const postRepo = trx.getRepository(JobPost);
      const appRepo  = trx.getRepository(JobApplication);

      await postRepo.update({ id: jobPostId }, { status: 'Closed', closed_at: new Date() });

      await appRepo
        .createQueryBuilder()
        .update(JobApplication)
        .set({ status: 'Rejected' })
        .where('job_post_id = :jobPostId', { jobPostId })
        .andWhere('status != :accepted', { accepted: 'Accepted' })
        .execute();
    });

    return this.jobPostsRepository.findOne({ where: { id: jobPostId } });
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
    salary_type?: 'per hour' | 'per month' | 'negotiable';
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
      - Do NOT insert empty lines between sections or inside lists (no extra blank lines at all).
      - Keep the total length between 150-180 words.
      - Ensure the markdown is simple, HTML-compatible, and suitable for rendering in ReactQuill rich text editor.
      - Do NOT insert extra <p> or blank paragraphs; output only clean markdown without extra spacing.

      **Structure**:
      One sentence summarizing the role based on the brief and title.
      ## Responsibilities
      - List 3-5 key duties extracted directly from the brief.
      ## Requirements
      - List 3-5 skills or qualifications from the brief.
      ## Work Details
      - **Work Mode**: ${data.location || 'Not specified'}
      - **Salary**: ${data.salary_type === 'negotiable' ? 'Negotiable' : (data.salary ? `${data.salary} ${data.salary_type || ''}` : 'Not specified')}
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