import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { EmailModule } from '../email/email.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [EmailModule, ConfigModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}