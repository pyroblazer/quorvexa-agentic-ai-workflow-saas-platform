import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { envSchema } from './config/env.schema';
import { WorkflowStepEntity } from './workflow/entities/workflow-step.entity';
import { WorkflowEntity } from './workflow/entities/workflow.entity';
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '.env.production', '../../.env.production'],
      validate: (config) => envSchema.parse(config),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [WorkflowEntity, WorkflowStepEntity],
        synchronize: false,
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
    WorkflowModule,
  ],
})
export class AppModule {}
