import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralLink } from './entities/referral-link.entity';
import { ReferralRegistration } from './entities/referral-registration.entity';
import { ReferralsController } from './referrals.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferralLink, ReferralRegistration]),
    forwardRef(() => AdminModule),
  ],
  controllers: [ReferralsController],
})
export class ReferralsModule {}