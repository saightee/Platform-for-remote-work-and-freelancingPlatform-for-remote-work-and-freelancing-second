import { Controller, Get, Param, Headers, UnauthorizedException, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

// Новый контроллер для чата обычных пользователей
@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  // Новый эндпоинт для получения истории чата для jobseeker/employer
  @UseGuards(AuthGuard('jwt'))
  @Get(':jobApplicationId')
  async getChatHistory(
    @Headers('authorization') authHeader: string,
    @Param('jobApplicationId') jobApplicationId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtService.verify(token);
    const userId = payload.sub;

    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;

    if (isNaN(parsedPage) || parsedPage < 1) {
      throw new BadRequestException('Page must be a positive integer');
    }
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      throw new BadRequestException('Limit must be a positive integer');
    }

    return this.chatService.getChatHistoryForUser(userId, jobApplicationId, parsedPage, parsedLimit);
  }
}