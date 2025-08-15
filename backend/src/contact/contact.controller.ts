import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ContactService } from './contact.service';
import { ContactMessageDto } from './dto/contact-message.dto';
import { OptionalJwtAuthGuard } from '../auth/strategies/optional-jwt.guard';
import { HybridThrottlerGuard } from './guards/hybrid-throttler.guard';

@Controller('contact')
@UseGuards(OptionalJwtAuthGuard, HybridThrottlerGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(202)
  async send(@Req() req: Request, @Body() dto: ContactMessageDto) {
    await this.contactService.send(dto, req.user as any | undefined);
    return { message: 'Message accepted' };
  }
}