import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '../user/user.module';

import { AuditService } from './audit.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuditLogEntity } from './entities/audit-log.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';


@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshTokenEntity, AuditLogEntity]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
      }),
    }),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuditService, JwtStrategy, JwtRefreshStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
