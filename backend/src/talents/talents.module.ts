import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TalentsService } from './talents.service';
import { TalentsController } from './talents.controller';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([JobSeeker, User, Category])],
  controllers: [TalentsController],
  providers: [TalentsService],
})
export class TalentsModule {}