import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockedCountry } from './blocked-country.entity';
import { BlockedCountriesService } from './blocked-countries.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlockedCountry]),
  ],
  providers: [BlockedCountriesService],
  exports: [BlockedCountriesService],
})
export class BlockedCountriesModule {}