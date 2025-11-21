import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Affiliate } from '../users/entities/affiliate.entity';
import { User } from '../users/entities/user.entity';
import { UpdateAffiliateProfileDto } from './dto/update-affiliate-profile.dto';

@Injectable()
export class AffiliatesService {
  constructor(
    @InjectRepository(Affiliate)
    private affiliateRepository: Repository<Affiliate>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async getProfileByUserId(userId: string) {
    const affiliate = await this.affiliateRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });
    if (!affiliate) {
      throw new NotFoundException('Affiliate profile not found');
    }
    return affiliate;
  }

  async updateProfileByUserId(userId: string, dto: UpdateAffiliateProfileDto) {
    const affiliate = await this.affiliateRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });

    if (!affiliate) {
      throw new NotFoundException('Affiliate profile not found');
    }

    if (dto.account_type !== undefined) {
      affiliate.account_type = dto.account_type as any;
    }
    if (dto.company_name !== undefined) {
      affiliate.company_name = dto.company_name?.trim() || null;
    }
    if (dto.website_url !== undefined) {
      affiliate.website_url = dto.website_url?.trim() || null;
    }
    if (dto.traffic_sources !== undefined) {
      affiliate.traffic_sources = dto.traffic_sources || null;
    }
    if (dto.promo_geo !== undefined) {
      affiliate.promo_geo = dto.promo_geo || null;
    }
    if (dto.monthly_traffic !== undefined) {
      affiliate.monthly_traffic = dto.monthly_traffic || null;
    }
    if (dto.payout_method !== undefined) {
      affiliate.payout_method = dto.payout_method || null;
    }
    if (dto.payout_details !== undefined) {
      affiliate.payout_details = dto.payout_details || null;
    }
    if (dto.telegram !== undefined) {
      affiliate.telegram = dto.telegram || null;
    }
    if (dto.whatsapp !== undefined) {
      affiliate.whatsapp = dto.whatsapp || null;
    }
    if (dto.skype !== undefined) {
      affiliate.skype = dto.skype || null;
    }
    if (dto.notes !== undefined) {
      affiliate.notes = dto.notes || null;
    }

    await this.affiliateRepository.save(affiliate);
    return this.getProfileByUserId(userId);
  }
}
