import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Affiliate } from '../users/entities/affiliate.entity';
import { User } from '../users/entities/user.entity';

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
}
