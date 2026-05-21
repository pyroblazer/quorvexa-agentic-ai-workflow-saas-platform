import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { envSchema } from './config/env.schema';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';
import { NotificationEntity } from './notification/entities/notification.entity';
import { NotificationModule } from './notification/notification.module';
import { NotificationTemplateEntity } from './template/entities/notification-template.entity';
import { TemplateModule } from './template/template.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.production', '.env', '../../.env.production', '../../.env'],
      validate: (config) => envSchema.parse(config),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [NotificationEntity, NotificationTemplateEntity],
        synchronize: config.get('NODE_ENV') === 'development',
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: true,
        ssl: config.get('NODE_ENV') === 'production'
          ? { rejectUnauthorized: true }
          : false,
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TerminusModule,
    TemplateModule,
    NotificationModule,
  ],
  controllers: [HealthController, MetricsController],
})
export class AppModule {}
