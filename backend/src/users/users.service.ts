import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, Not, IsNull, In } from 'typeorm';
import { User } from './entities/user.entity';
import { JobSeeker } from './entities/jobseeker.entity';
import { Employer } from './entities/employer.entity';
import { Category } from '../categories/category.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobSeeker)
    private jobSeekerRepository: Repository<JobSeeker>,
    @InjectRepository(Employer)
    private employerRepository: Repository<Employer>,
    @InjectRepository(Category) 
    private categoriesRepository: Repository<Category>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  async create(userData: Partial<User> & { email: string; username: string; role: 'employer'|'jobseeker'|'admin'|'moderator' },   additionalData: any): Promise<User> {
    const userEntity: DeepPartial<User> = {
      email: userData.email,
      username: userData.username,
      password: userData.password || '',
      role: userData.role,
      provider: userData.provider || null,
      country: userData.country || null,
      is_email_verified: userData.is_email_verified || false,
      brand: userData.brand || null,
      avatar: userData.avatar || null,
    };
    const user = this.usersRepository.create(userEntity);
    const savedUser = await this.usersRepository.save(user);

    if (userData.role === 'jobseeker') {
      const jobSeekerEntity: DeepPartial<JobSeeker> = {
        user_id: savedUser.id,
        timezone: additionalData.timezone || 'UTC',
        currency: additionalData.currency || 'USD',
        job_search_status: additionalData.job_search_status || 'open_to_offers',
        linkedin: additionalData.linkedin || null,
        instagram: additionalData.instagram || null,
        facebook: additionalData.facebook || null,
        description: additionalData.description || null,
        whatsapp: additionalData.whatsapp || null,
        telegram: additionalData.telegram || null,
        date_of_birth: additionalData.date_of_birth || null,
      };

      jobSeekerEntity.resume = additionalData.resume || null;
      jobSeekerEntity.experience = additionalData.experience || null;
    
      if (Array.isArray(additionalData.languages)) {
        jobSeekerEntity.languages = additionalData.languages;
      }

      if (additionalData.skills && Array.isArray(additionalData.skills)) {
        jobSeekerEntity.skills = await this.categoriesRepository.findByIds(additionalData.skills);
      } else {
        jobSeekerEntity.skills = [];
      }

      const jobSeeker = this.jobSeekerRepository.create(jobSeekerEntity);
      await this.jobSeekerRepository.save(jobSeeker);

    } else if (userData.role === 'employer') {
      const employerEntity: DeepPartial<Employer> = {
        user_id: savedUser.id,
        company_name: additionalData.company_name || '',
        company_info: additionalData.company_info || '',
        referral_link: additionalData.referral_link || '',
        timezone: additionalData.timezone || 'UTC',
        currency: additionalData.currency || 'USD',
      };
      const employer = this.employerRepository.create(employerEntity);
      await this.employerRepository.save(employer);
      console.log('Employer profile created:', employer);

    } else if (userData.role === 'admin' || userData.role === 'moderator') {
      console.log(`${userData.role} user created:`, savedUser);
    }

    return savedUser;
  }

  async setLastLoginAt(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { last_login_at: () => 'CURRENT_TIMESTAMP' });
  }

  async touchLastSeen(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { last_seen_at: () => 'CURRENT_TIMESTAMP' });
  }

  async updateUser(
    userId: string,
    role: 'employer' | 'jobseeker' | 'admin' | 'moderator',
    additionalData: any
  ) {
    console.log(`[UsersService] Обновление пользователя: userId=${userId}, role=${role}, data=${JSON.stringify(additionalData)}`);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      console.error(`[UsersService] Пользователь не найден: userId=${userId}`);
      throw new NotFoundException('User not found');
    }

    if (additionalData.is_email_verified !== undefined) user.is_email_verified = additionalData.is_email_verified;
    if (role) user.role = role;
    if (additionalData.username) user.username = additionalData.username;
    if (additionalData.email) user.email = additionalData.email;
    if (additionalData.country) user.country = additionalData.country;
    if (additionalData.avatar) user.avatar = additionalData.avatar;
    if (additionalData.status) user.status = additionalData.status;
    if (additionalData.risk_score !== undefined) user.risk_score = additionalData.risk_score;

    try {
      const updatedUser = await this.usersRepository.save(user);
      console.log(`[UsersService] User updated: ${JSON.stringify(updatedUser)}`);
    } catch (error) {
      console.error(`[UsersService] Error during user update: ${error.message}`);
      throw error;
    }

    if (role === 'jobseeker') {
      let jobSeeker = await this.jobSeekerRepository.findOne({ where: { user_id: userId }, relations: ['skills'] });
      if (!jobSeeker) {
        jobSeeker = this.jobSeekerRepository.create({ user_id: userId });
      }
      if (additionalData.skills) jobSeeker.skills = additionalData.skills;
      if (additionalData.experience) jobSeeker.experience = additionalData.experience;
      if (additionalData.description) jobSeeker.description = additionalData.description;
      if (additionalData.portfolio) jobSeeker.portfolio = additionalData.portfolio;
      if (additionalData.video_intro) jobSeeker.video_intro = additionalData.video_intro;
      if (additionalData.timezone) jobSeeker.timezone = additionalData.timezone;
      if (additionalData.currency) jobSeeker.currency = additionalData.currency;
      if (additionalData.resume) jobSeeker.resume = additionalData.resume;

      if (Object.prototype.hasOwnProperty.call(additionalData, 'job_search_status')) {
        const allowed = ['actively_looking', 'open_to_offers', 'hired'] as const;
        if (!allowed.includes(additionalData.job_search_status)) {
          throw new BadRequestException('job_search_status must be one of: actively_looking | open_to_offers | hired');
        }
        (jobSeeker as any).job_search_status = additionalData.job_search_status;
      }

      await this.jobSeekerRepository.save(jobSeeker);
      console.log(`[UsersService] JobSeeker profile updated: ${JSON.stringify(jobSeeker)}`);

    } else if (role === 'employer') {
      const employerEntity: DeepPartial<Employer> = {
        user_id: userId,
        company_name: additionalData.company_name || '',
        company_info: additionalData.company_info || '',
        referral_link: additionalData.referral_link || '',
        timezone: additionalData.timezone || 'UTC',
        currency: additionalData.currency || 'USD',
      };
      const employer = this.employerRepository.create(employerEntity);
      await this.employerRepository.save(employer);
      console.log(`[UsersService] Employer profile updated: ${JSON.stringify(employer)}`);
    }

    return user;
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
  
    user.password = newPassword;
    await this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const norm = (email || '').trim().toLowerCase();
    return this.usersRepository.createQueryBuilder('u')
      .where('LOWER(u.email) = :email', { email: norm })
      .getOne();
  }

  async getRegistrationStats(
    startDate: Date,
    endDate: Date,
    interval: 'day' | 'week' | 'month',
    role: 'jobseeker' | 'employer' | 'all' = 'all' 
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);
  
    const query = this.usersRepository
      .createQueryBuilder('user')
      .select(`DATE_TRUNC('${interval}', user.created_at AT TIME ZONE 'UTC') as period`)
      .addSelect('COUNT(*) as count')
      .where('user.created_at AT TIME ZONE \'UTC\' BETWEEN :startDate AND :endDate', { startDate: start, endDate: end });
  
    if (role !== 'all') {
      query.andWhere('user.role = :role', { role });
    }
  
    query.groupBy('period').orderBy('period', 'ASC');
  
    const result = await query.getRawMany();
  
    return result.map(row => ({
      period: row.period,
      count: parseInt(row.count, 10),
    }));
  }

  async getGeographicDistribution() {
    const query = this.usersRepository.createQueryBuilder('user')
      .select('user.country as country')
      .addSelect('COUNT(*) as count')
      .where('user.country IS NOT NULL')
      .groupBy('user.country')
      .orderBy('count', 'DESC');

    const result = await query.getRawMany();
    const totalUsers = await this.usersRepository.count({ where: { country: Not(IsNull()) } });

    return result.map(row => ({
      country: row.country,
      count: parseInt(row.count, 10),
      percentage: totalUsers ? (parseInt(row.count, 10) / totalUsers * 100).toFixed(2) : 0,
    }));
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id: userId } });
  }
}