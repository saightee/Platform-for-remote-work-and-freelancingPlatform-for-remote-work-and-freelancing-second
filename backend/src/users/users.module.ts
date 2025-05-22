import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { JobSeeker } from './entities/jobseeker.entity';
import { Employer } from './entities/employer.entity';
import { SkillCategory } from '../skill-categories/skill-category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, JobSeeker, Employer, SkillCategory]),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}