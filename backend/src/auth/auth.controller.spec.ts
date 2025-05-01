import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth.module';
import { RedisService } from '../redis/redis.service';
import { User } from '../users/entities/user.entity';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let redisService: RedisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'onlinejobs_user',
          password: 'jgtzNxhokQYD',
          database: 'onlinejobs_db',
          entities: [User],
          synchronize: true,
        }),
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    redisService = moduleFixture.get<RedisService>(RedisService);
    await redisService.getClient().flushall();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await redisService.getClient().flushall();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password',
          username: 'test',
        })
        .expect(201);

      expect(response.body).toEqual({
        message: 'User registered',
        userId: expect.any(Number),
      });
    });

    it('should fail to register a user with an existing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password',
          username: 'test',
        });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password2',
          username: 'test2',
        })
        .expect(400);

      expect(response.body).toEqual({
        statusCode: 400,
        message: 'Email already exists',
        error: 'Bad Request',
      });
    });
  });

  describe('POST /auth/login', () => {
    it('should login a user and return a token', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password',
          username: 'test',
        });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password',
        })
        .expect(201);

      expect(response.body).toEqual({
        accessToken: expect.any(String),
      });

      const userId = 1;
      const token = await redisService.get(`token:${userId}`);
      expect(token).toBe(response.body.accessToken);
    });

    it('should fail to login with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password',
          username: 'test',
        });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toEqual({
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      });
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout a user and blacklist the token', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password',
          username: 'test',
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password',
        });

      const token = loginResponse.body.accessToken;

      const logoutResponse = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(logoutResponse.body).toEqual({
        message: 'Logout successful',
      });

      const blacklisted = await redisService.get(`blacklist:${token}`);
      expect(blacklisted).toBe('true');

      const activeToken = await redisService.get(`token:1`);
      expect(activeToken).toBeNull();
    });

    it('should fail to logout with an already blacklisted token', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password',
          username: 'test',
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password',
        });

      const token = loginResponse.body.accessToken;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body).toEqual({
        statusCode: 401,
        message: 'Token already invalidated',
        error: 'Unauthorized',
      });
    });
  });
});