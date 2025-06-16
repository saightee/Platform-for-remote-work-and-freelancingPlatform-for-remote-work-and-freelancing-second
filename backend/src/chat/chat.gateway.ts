import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token?.replace('Bearer ', '');
      if (!token) {
        throw new UnauthorizedException('Token is required');
      }
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'mySuperSecretKey123!@#ForLocalDev2025'),
      });
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      // Store socket ID in Redis
      await this.redisService.set(`socket:${client.data.userId}`, client.id, 3600);
      console.log(`User ${client.data.userId} connected with socket ID ${client.id}`);
    } catch (error) {
      client.disconnect();
      console.error('Connection error:', error.message);
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.userId) {
      await this.redisService.del(`socket:${client.data.userId}`);
      console.log(`User ${client.data.userId} disconnected`);
    }
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() data: { jobApplicationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { jobApplicationId } = data;
    const userId = client.data.userId;

    const hasAccess = await this.chatService.hasChatAccess(userId, jobApplicationId);
    if (!hasAccess) {
      throw new UnauthorizedException('No access to this chat');
    }

    const room = `chat:${jobApplicationId}`;
    client.join(room);
    console.log(`User ${userId} joined chat room ${room}`);

    // Send chat history to the client
    const messages = await this.chatService.getChatHistory(jobApplicationId);
    client.emit('chatHistory', messages);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { jobApplicationId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { jobApplicationId, content } = data;
    const senderId = client.data.userId;

    const message = await this.chatService.createMessage(senderId, jobApplicationId, content);
    const room = `chat:${jobApplicationId}`;

    // Broadcast message to the chat room
    this.server.to(room).emit('newMessage', message);

    // Cache message in Redis (optional, for quick access)
    await this.redisService.set(`message:${message.id}`, JSON.stringify(message), 3600);

    return message;
  }
}