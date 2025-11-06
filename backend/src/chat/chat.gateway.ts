import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { createAdapter } from '@socket.io/redis-adapter';

const BASE = process.env.BASE_URL || '';
const ORIGIN = BASE.replace(/\/api\/?$/, '');

@WebSocketGateway({
  cors: {
    origin: [ORIGIN, 'http://localhost:3000'],
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
    private redisService: RedisService,
  ) {
    console.log('ChatGateway constructed');
  }

  async afterInit() {
    console.log('ChatGateway afterInit, server:', this.server ? 'Initialized' : 'Not initialized');
    try {
      const redisClient = this.redisService.getClient();
      console.log('Redis client:', redisClient ? 'Available' : 'Not available');
      const pubClient = redisClient.duplicate();
      const subClient = redisClient.duplicate();
      this.server.adapter(createAdapter(pubClient, subClient));
      console.log('Socket.IO server initialized with Redis adapter');
    } catch (error) {
      console.error('Error initializing Socket.IO adapter:', error);
    }

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
      const raw = client.handshake.auth?.token;
      const token = raw?.replace(/^Bearer\s+/i, '');
      if (!token) throw new UnauthorizedException('Token is required');
    
      const payload = this.jwtService.verify(token);
    
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      client.data.joinedRooms = new Set<string>();
    
      await this.redisService.set(`socket:${payload.sub}`, client.id, 3600);
    
      const userRoom = `user:${client.data.userId}`;
      client.join(userRoom);
      console.log(`User ${client.data.userId} joined ${userRoom}`);
    } catch (err: any) {
      const msg = err?.name === 'TokenExpiredError' ? 'Token expired' : err?.message || 'Unauthorized';
      client.emit('error', { message: msg });
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
      const application = await this.chatService.hasChatAccess(userId, jobApplicationId);
      if (!application) {
        throw new NotFoundException('Job application not found');
      }

      const room = `chat:${jobApplicationId}`;
      if (client.data.joinedRooms.has(room)) {
        console.log(`User ${userId} already in chat room ${room}, skipping join`);
        return;
      }

      client.join(room);
      client.data.joinedRooms.add(room); 
      console.log(`User ${userId} joined chat room ${room}`);

      if (!this.server) {
        console.error('Socket.IO server is null in ChatGateway');
      } else {
        this.server.to(room).emit('chatInitialized', {
          jobApplicationId,
          jobSeekerId: application.job_seeker_id,
          employerId: application.job_post.employer_id,
        });
        console.log(`Emitted chatInitialized for room ${room}`);
      }

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

    try {
      const message = await this.chatService.createMessage(senderId, jobApplicationId, content);

      const chatRoom = `chat:${jobApplicationId}`;
      const recipientRoom = `user:${message.recipient_id}`;

      this.server.to(chatRoom).emit('newMessage', message);
      this.server.to(recipientRoom).except(chatRoom).emit('newMessage', message);

      return message;
    } catch (error: any) {
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
      client.to(room).emit('typing', { userId: client.data.userId, jobApplicationId, isTyping });
      console.log(`Broadcasted typing event to room ${room} for user ${userId}`);
    } catch (error) {
      console.error(`Typing event error for user ${userId}: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('broadcastToApplicants')
  async handleBroadcast(
    @MessageBody() data: { jobPostId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const employerId = client.data.userId;
    const { jobPostId, content } = data;
  
    const saved = await this.chatService.broadcastToApplicants(employerId, jobPostId, content);
  
    for (const msg of saved) {
      const chatRoom = `chat:${msg.job_application_id}`;
      const recipientRoom = `user:${msg.recipient_id}`;
    
      this.server.to(chatRoom).emit('newMessage', msg);
      this.server.to(recipientRoom).except(chatRoom).emit('newMessage', msg);
    }
  
    return { sent: saved.length };
  }

  @SubscribeMessage('broadcastToSelected')
  async handleBroadcastSelected(
    @MessageBody() data: { jobPostId: string; applicationIds: string[]; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const employerId = client.data.userId;
    const { jobPostId, applicationIds, content } = data;
  
    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      throw new Error('applicationIds must be a non-empty array');
    }
    if (!content || !content.trim()) {
      throw new Error('Content is required');
    }
  
    const saved = await this.chatService.broadcastToSelectedApplicants(
      employerId,
      jobPostId,
      applicationIds,
      content,
    );
  
    for (const msg of saved) {
      const chatRoom = `chat:${msg.job_application_id}`;
      const recipientRoom = `user:${msg.recipient_id}`;
      this.server.to(chatRoom).emit('newMessage', msg);
      this.server.to(recipientRoom).except(chatRoom).emit('newMessage', msg);
    }
  
    return { sent: saved.length };
  }

}