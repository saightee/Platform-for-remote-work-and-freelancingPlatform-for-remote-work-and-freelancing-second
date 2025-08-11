import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationLimit } from './application-limit.entity';
import { ApplicationLimitsService } from './application-limits.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApplicationLimit])],
  providers: [ApplicationLimitsService],
  exports: [ApplicationLimitsService],
})
export class ApplicationLimitsModule {}