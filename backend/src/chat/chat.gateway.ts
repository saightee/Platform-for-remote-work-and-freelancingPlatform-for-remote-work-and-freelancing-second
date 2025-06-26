// chat.gateway.ts
import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { createAdapter } from '@socket.io/redis-adapter';

@WebSocketGateway({
  cors: {
    origin: ['https://jobforge.net', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 30000,
  transports: ['websocket', 'polling'],
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async afterInit() {
    const redisClient = this.redisService.getClient();
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();
    this.server.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.IO server initialized with Redis adapter');

    this.server.engine.on('connection_error', (err) => {
      console.error('Socket.IO connection error:', {
        code: err.code,
        message: err.message,
        context: err.context,
      });
    });
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token?.replace('Bearer ', '');
      if (!token) {
        throw new UnauthorizedException('Token is required');
      }
      try {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET', 'mySuperSecretKey123!@#ForLocalDev2025'),
        });
        const userId = payload.sub;

        // Удалить старые сокет-ключи
        const oldSocketId = await this.redisService.get(`socket:${userId}`);
        if (oldSocketId && oldSocketId !== client.id) {
          await this.redisService.del(`socket:${userId}`);
        }

        client.data.userId = userId;
        client.data.role = payload.role;
        await this.redisService.set(`socket:${userId}`, client.id, 3600);
        console.log(`User ${userId} connected with socket ID ${client.id}, transport: ${client.conn.transport.name}`);
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          client.emit('error', { message: 'Token expired, please refresh token' });
          client.disconnect();
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Connection error:', error.message);
      client.emit('error', { message: error.message });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.userId) {
      await this.redisService.del(`socket:${client.data.userId}`);
      console.log(`User ${client.data.userId} disconnected, Redis key removed`);
    }
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() data: { jobApplicationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { jobApplicationId } = data;
    const userId = client.data.userId;

    try {
      const hasAccess = await this.chatService.hasChatAccess(userId, jobApplicationId);
      if (!hasAccess) {
        throw new UnauthorizedException('No access to this chat');
      }

      const room = `chat:${jobApplicationId}`;
      client.join(room);
      console.log(`User ${userId} joined chat room ${room}`);

      const messages = await this.chatService.getChatHistory(jobApplicationId);
      client.emit('chatHistory', messages);
    } catch (error) {
      client.emit('error', { message: error.message });
      console.error(`Join chat error for user ${userId}:`, error.message);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { jobApplicationId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { jobApplicationId, content } = data;
    const senderId = client.data.userId;

    try {
      const message = await this.chatService.createMessage(senderId, jobApplicationId, content);
      const room = `chat:${jobApplicationId}`;
      this.server.to(room).emit('newMessage', message);

      console.log(`Message sent to room ${room} by user ${senderId}`);
      return message;
    } catch (error) {
      client.emit('error', { message: error.message });
      console.error(`Send message error for user ${senderId}:`, error.message);
    }
  }
}