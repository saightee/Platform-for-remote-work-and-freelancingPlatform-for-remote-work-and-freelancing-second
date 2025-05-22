import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, Not, IsNull, In } from 'typeorm';
import { User } from './entities/user.entity';
import { JobSeeker } from './entities/jobseeker.entity';
import { Employer } from './entities/employer.entity';
import { SkillCategory } from '../skill-categories/skill-category.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobSeeker)
    private jobSeekerRepository: Repository<JobSeeker>,
    @InjectRepository(Employer)
    private employerRepository: Repository<Employer>,
    @InjectRepository(SkillCategory)
    private skillCategoriesRepository: Repository<SkillCategory>,
  ) {}

  async create(
    userData: Partial<User> & { email: string; username: string; role: 'employer' | 'jobseeker' | 'admin' },
    additionalData: any,
  ): Promise<User> {
    console.log('Creating user with data:', userData);
    const userEntity: DeepPartial<User> = {
      email: userData.email,
      username: userData.username,
      password: userData.password || '',
      role: userData.role,
      provider: userData.provider || null,
      country: userData.country || null,
    };
    const user = this.usersRepository.create(userEntity);
    const savedUser = await this.usersRepository.save(user);
    console.log('User saved to database:', savedUser);

    if (userData.role === 'jobseeker') {
      // Загружаем категории навыков, если указаны
      let skillCategories: SkillCategory[] = [];
      if (additionalData.skillCategoryIds && Array.isArray(additionalData.skillCategoryIds)) {
        skillCategories = await this.skillCategoriesRepository.find({
          where: { id: In(additionalData.skillCategoryIds) },
        });
      }

      const jobSeekerEntity: DeepPartial<JobSeeker> = {
        user_id: savedUser.id,
        skills: additionalData.skills || [],
        skillCategories,
        experience: additionalData.experience || '',
        portfolio: additionalData.portfolio || '',
        video_intro: additionalData.video_intro || '',
        timezone: additionalData.timezone || 'UTC',
        currency: additionalData.currency || 'USD',
      };
      const jobSeeker = this.jobSeekerRepository.create(jobSeekerEntity);
      await this.jobSeekerRepository.save(jobSeeker);
      console.log('JobSeeker profile created:', jobSeeker);
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
    } else if (userData.role === 'admin') {
      console.log('Admin user created:', savedUser);
    }

    return savedUser;
  }

  async updateUser(userId: string, role: 'employer' | 'jobseeker', additionalData: any) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = role;
    await this.usersRepository.save(user);

    if (role === 'jobseeker') {
      // Загружаем категории навыков, если указаны
      let skillCategories: SkillCategory[] = [];
      if (additionalData.skillCategoryIds && Array.isArray(additionalData.skillCategoryIds)) {
        skillCategories = await this.skillCategoriesRepository.find({
          where: { id: In(additionalData.skillCategoryIds) },
        });
      }

      const jobSeekerEntity: DeepPartial<JobSeeker> = {
        user_id: userId,
        skills: additionalData.skills || [],
        skillCategories,
        experience: additionalData.experience || '',
        portfolio: additionalData.portfolio || '',
        video_intro: additionalData.video_intro || '',
        timezone: additionalData.timezone || 'UTC',
        currency: additionalData.currency || 'USD',
      };
      const jobSeeker = this.jobSeekerRepository.create(jobSeekerEntity);
      await this.jobSeekerRepository.save(jobSeeker);
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
    }
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    console.log('Updating password for userId:', userId, 'with new hashed password:', newPassword);
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    user.password = newPassword;
    await this.usersRepository.save(user);
    
    const updatedUser = await this.usersRepository.findOne({ where: { id: userId } });
    console.log('Updated user password in DB:', updatedUser?.password);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async getRegistrationStats(startDate: Date, endDate: Date, interval: 'day' | 'week' | 'month') {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    const query = this.usersRepository.createQueryBuilder('user')
      .select(`DATE_TRUNC('${interval}', user.created_at AT TIME ZONE 'UTC') as period`)
      .addSelect('COUNT(*) as count')
      .where('user.created_at AT TIME ZONE \'UTC\' BETWEEN :startDate AND :endDate', { startDate: start, endDate: end })
      .groupBy('period')
      .orderBy('period', 'ASC');

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
}