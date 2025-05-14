import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { User } from './entities/user.entity';
import { JobSeeker } from './entities/jobseeker.entity';
import { Employer } from './entities/employer.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(JobSeeker)
    private jobSeekerRepository: Repository<JobSeeker>,
    @InjectRepository(Employer)
    private employerRepository: Repository<Employer>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    console.log('Finding user by email:', email);
    const user = await this.usersRepository.findOne({ where: { email } });
    console.log('Find by email result:', user);
    return user ?? null;
  }

  async create(userData: Partial<User> & { email: string; username: string; role: 'employer' | 'jobseeker' | 'admin' }, additionalData: any): Promise<User> {
    console.log('Creating user with data:', userData);
    const userEntity: DeepPartial<User> = {
      email: userData.email,
      username: userData.username,
      password: userData.password || '',
      role: userData.role,
      provider: userData.provider || null,
    };
    const user = this.usersRepository.create(userEntity);
    const savedUser = await this.usersRepository.save(user);
    console.log('User saved to database:', savedUser);
  
    if (userData.role === 'jobseeker') {
      const jobSeekerEntity: DeepPartial<JobSeeker> = {
        user_id: savedUser.id,
        skills: additionalData.skills || [],
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
      // Для admin ничего дополнительного не создаем
      console.log('Admin user created:', savedUser);
    }
  
    return savedUser;
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    await this.usersRepository.update(userId, { password: newPassword });
  }

  async updateRole(userId: string, role: 'employer' | 'jobseeker'): Promise<void> {
    await this.usersRepository.update(userId, { role });
  }

  async updateUser(userId: string, role: 'employer' | 'jobseeker', additionalData: any): Promise<void> {
    await this.usersRepository.update(userId, { role });
    if (role === 'jobseeker') {
      const jobSeekerEntity: DeepPartial<JobSeeker> = {
        user_id: userId,
        skills: additionalData.skills || [],
        experience: additionalData.experience || '',
        portfolio: additionalData.portfolio || '',
        video_intro: additionalData.video_intro || '',
        timezone: additionalData.timezone || 'UTC',
        currency: additionalData.currency || 'USD',
      };
      await this.jobSeekerRepository.upsert(jobSeekerEntity, ['user_id']);
      console.log('JobSeeker profile updated:', jobSeekerEntity);
    } else if (role === 'employer') {
      const employerEntity: DeepPartial<Employer> = {
        user_id: userId,
        company_name: additionalData.company_name || '',
        company_info: additionalData.company_info || '',
        referral_link: additionalData.referral_link || '',
        timezone: additionalData.timezone || 'UTC',
        currency: additionalData.currency || 'USD',
      };
      await this.employerRepository.upsert(employerEntity, ['user_id']);
      console.log('Employer profile updated:', employerEntity);
    }
  }
}