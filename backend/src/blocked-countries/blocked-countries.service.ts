import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockedCountry } from './blocked-country.entity';
import * as geoip from 'geoip-lite';

@Injectable()
export class BlockedCountriesService {
  constructor(
    @InjectRepository(BlockedCountry)
    private blockedCountriesRepository: Repository<BlockedCountry>,
  ) {}

  async addBlockedCountry(countryCode: string): Promise<BlockedCountry> {
    const existing = await this.blockedCountriesRepository.findOne({ where: { country_code: countryCode } });
    if (existing) {
      throw new BadRequestException('Country already blocked');
    }

    const blockedCountry = this.blockedCountriesRepository.create({ country_code: countryCode });
    return this.blockedCountriesRepository.save(blockedCountry);
  }

  async removeBlockedCountry(countryCode: string): Promise<void> {
    const blockedCountry = await this.blockedCountriesRepository.findOne({ where: { country_code: countryCode } });
    if (!blockedCountry) {
      throw new NotFoundException('Country not found in blocked list');
    }

    await this.blockedCountriesRepository.delete({ country_code: countryCode });
  }

  async getBlockedCountries(): Promise<BlockedCountry[]> {
    return this.blockedCountriesRepository.find();
  }

  async isCountryBlocked(ip: string): Promise<boolean> {
    const geo = geoip.lookup(ip);
    if (!geo || !geo.country) {
      return false;
    }

    const blockedCountry = await this.blockedCountriesRepository.findOne({ where: { country_code: geo.country } });
    return !!blockedCountry;
  }
}