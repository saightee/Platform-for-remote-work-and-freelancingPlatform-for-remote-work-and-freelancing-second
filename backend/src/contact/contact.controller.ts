import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { ContactMessageDto } from './dto/contact-message.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @Throttle({ default: { limit: 3, ttl: 60 } })
  @HttpCode(HttpStatus.ACCEPTED)
  async send(@Body() dto: ContactMessageDto) {
    await this.contactService.send(dto);
    return { message: 'Message accepted' };
  }
}