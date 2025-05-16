import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config(); // Загружаем .env

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'onlinejobs_user',
  password: process.env.POSTGRES_PASSWORD || 'onlinejobs123',
  database: process.env.POSTGRES_DB || 'onlinejobs_db',
  schema: 'public',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migration/*.ts'],
});