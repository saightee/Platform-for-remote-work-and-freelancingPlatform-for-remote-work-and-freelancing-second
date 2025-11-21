import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AffiliateOffer } from './entities/affiliate-offer.entity';
import { AffiliateOfferGeoRule } from './entities/affiliate-offer-geo-rule.entity';
import { AffiliateLink } from './entities/affiliate-link.entity';
import { AffiliateClick } from './entities/affiliate-click.entity';
import { AffiliateRegistration } from './entities/affiliate-registration.entity';
import { User } from '../users/entities/user.entity';
import { Affiliate } from '../users/entities/affiliate.entity';

import { AffiliateProgramService } from './affiliate-program.service';
import { AffiliateProgramController } from './affiliate-program.controller';
import { AffiliatePublicController } from './affiliate-public.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AffiliateOffer,
      AffiliateOfferGeoRule,
      AffiliateLink,
      AffiliateClick,
      AffiliateRegistration,
      User,
      Affiliate,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  providers: [AffiliateProgramService],
  controllers: [AffiliateProgramController, AffiliatePublicController],
  exports: [AffiliateProgramService],
})
export class AffiliateProgramModule {}
