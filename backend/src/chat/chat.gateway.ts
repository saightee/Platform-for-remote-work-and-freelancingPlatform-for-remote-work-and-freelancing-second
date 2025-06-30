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
      console.log(`WebSocket connection attempt, namespace: ${client.nsp.name}, token: ${token ? '[present]' : 'missing'}, transport: ${client.conn.transport.name}, clientIP: ${client.handshake.address}`);
      if (!token) {
        throw new UnauthorizedException('Token is required');
      }
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'mySuperSecretKey123!@#ForLocalDev2025'),
      });
      console.log(`WebSocket connected: userId=${payload.sub}, role=${payload.role}, socketId=${client.id}`);
      
      const oldSocketId = await this.redisService.get(`socket:${payload.sub}`);
      if (oldSocketId && oldSocketId !== client.id) {
        console.log(`Removing old socket for userId=${payload.sub}, oldSocketId=${oldSocketId}`);
        await this.redisService.del(`socket:${payload.sub}`);
      }

      client.data.userId = payload.sub;
      client.data.role = payload.role;
      await this.redisService.set(`socket:${payload.sub}`, client.id, 3600);
    } catch (error) {
      console.error(`WebSocket connection error: ${error.message}, namespace: ${client.nsp.name}, clientIP: ${client.handshake.address}`);
      client.emit('error', { message: error.message });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.userId) {
      await this.redisService.del(`socket:${client.data.userId}`);
      console.log(`User ${client.data.userId} disconnected, socketId=${client.id}, namespace: ${client.nsp.name}`);
    }
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() data: { jobApplicationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { jobApplicationId } = data;
    const userId = client.data.userId;
    console.log(`JoinChat attempt: userId=${userId}, jobApplicationId=${jobApplicationId}, namespace: ${client.nsp.name}`);

    try {
      const hasAccess = await this.chatService.hasChatAccess(userId, jobApplicationId);
      if (!hasAccess) {
        throw new UnauthorizedException('No access to this chat');
      }

      const room = `chat:${jobApplicationId}`;
      client.join(room);
      console.log(`User ${userId} joined chat room ${room}`);

      // Отмечаем сообщения как прочитанные для получателя
      await this.chatService.markMessagesAsRead(jobApplicationId, userId);

      const messages = await this.chatService.getChatHistory(jobApplicationId);
      client.emit('chatHistory', messages);
    } catch (error) {
      console.error(`JoinChat error for user ${userId}: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { jobApplicationId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { jobApplicationId, content } = data;
    const senderId = client.data.userId;
    console.log(`SendMessage attempt: userId=${senderId}, jobApplicationId=${jobApplicationId}, content="${content}"`);

    try {
      const message = await this.chatService.createMessage(senderId, jobApplicationId, content);
      const room = `chat:${jobApplicationId}`;
      this.server.to(room).emit('newMessage', message);
      console.log(`Message sent to room ${room} by user ${senderId}`);
      return message;
    } catch (error) {
      console.error(`SendMessage error for user ${senderId}: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('markMessagesAsRead')
  async handleMarkMessagesAsRead(
    @MessageBody() data: { jobApplicationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { jobApplicationId } = data;
    const userId = client.data.userId;
    console.log(`MarkMessagesAsRead attempt: userId=${userId}, jobApplicationId=${jobApplicationId}`);

    try {
      const updatedMessages = await this.chatService.markMessagesAsRead(jobApplicationId, userId);
      const room = `chat:${jobApplicationId}`;
      this.server.to(room).emit('messagesRead', updatedMessages);
      console.log(`Messages marked as read for user ${userId} in room ${room}`);
    } catch (error) {
      console.error(`MarkMessagesAsRead error for user ${userId}: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { jobApplicationId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const { jobApplicationId, isTyping } = data;
    const userId = client.data.userId;
    console.log(`Typing event: userId=${userId}, jobApplicationId=${jobApplicationId}, isTyping=${isTyping}`);

    try {
      const hasAccess = await this.chatService.hasChatAccess(userId, jobApplicationId);
      if (!hasAccess) {
        throw new UnauthorizedException('No access to this chat');
      }

      const room = `chat:${jobApplicationId}`;
      // Транслируем другим клиентам в комнате (исключая отправителя)
      client.to(room).emit('typing', { userId, isTyping });
      console.log(`Broadcasted typing event to room ${room} for user ${userId}`);
    } catch (error) {
      console.error(`Typing event error for user ${userId}: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }
}