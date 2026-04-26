import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { AuditLogEntity } from '../auth/entities/audit-log.entity';
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';
import { UserEntity } from '../user/entities/user.entity';

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: config.get<string>('DATABASE_URL'),
  entities: [UserEntity, RefreshTokenEntity, AuditLogEntity],
  migrations: ['dist/database/migrations/*.js'],
  migrationsRun: true,
  synchronize: config.get('NODE_ENV') === 'development',
  logging: config.get('NODE_ENV') === 'development',
  ssl:
    config.get('NODE_ENV') === 'production'
      ? { rejectUnauthorized: true }
      : false,
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});
