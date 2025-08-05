import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export const createDataSource = (configService: ConfigService) => {
  return new DataSource({
    type: 'postgres',
    host: configService.get('POSTGRES_HOST'),
    port: configService.get('POSTGRES_PORT'),
    username: configService.get('POSTGRES_USER'),
    password: configService.get('POSTGRES_PASSWORD'),
    database: configService.get('POSTGRES_DB'),
    schema: 'public',
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/migration/*.ts'],
  });
};