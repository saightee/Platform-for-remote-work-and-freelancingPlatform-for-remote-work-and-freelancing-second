import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AntiFraudService } from './anti-fraud.service';
import { UserFingerprint } from './entities/user-fingerprint.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserFingerprint, User]),
  ],
  providers: [AntiFraudService],
  exports: [AntiFraudService],
})
export class AntiFraudModule {}