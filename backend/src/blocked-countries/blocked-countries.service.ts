import { Injectable, BadRequestException } from '@nestjs/common';
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

  async addBlockedCountry(adminId: string, countryCode: string): Promise<BlockedCountry> {
    const existingCountry = await this.blockedCountriesRepository.findOne({ where: { country_code: countryCode } });
    if (existingCountry) {
      throw new BadRequestException('Country is already blocked');
    }

    const blockedCountry = this.blockedCountriesRepository.create({ country_code: countryCode });
    return this.blockedCountriesRepository.save(blockedCountry);
  }

  async removeBlockedCountry(adminId: string, countryCode: string): Promise<void> {
    const blockedCountry = await this.blockedCountriesRepository.findOne({ where: { country_code: countryCode } });
    if (!blockedCountry) {
      throw new BadRequestException('Country is not blocked');
    }

    await this.blockedCountriesRepository.delete({ country_code: countryCode });
  }

  async getBlockedCountries(adminId: string): Promise<BlockedCountry[]> {
    return this.blockedCountriesRepository.find();
  }

  async isCountryBlocked(ip: string): Promise<boolean> {
    const geo = geoip.lookup(ip);
    if (!geo || !geo.country) {
      return false; // Если не удалось определить страну, пропускаем проверку
    }

    const blockedCountry = await this.blockedCountriesRepository.findOne({ where: { country_code: geo.country } });
    return !!blockedCountry;
  }
}