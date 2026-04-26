import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createLogger } from '@quorvexa/observability';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';

import { UserEntity, UserRole, UserStatus } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';

import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenEntity } from './entities/refresh-token.entity';


const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = createLogger('auth-service:auth');

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
  ) {}

  async register(dto: RegisterDto): Promise<LoginResponseDto> {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await this.userService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.MEMBER,
      status: UserStatus.ACTIVE,
      tenantId: dto.tenantId ?? 'default',
    });

    return this.generateTokenPair(user);
  }

  // ELI5: Like a bouncer checking your ID — validates password and issues wristbands (tokens)
  async validateLocalUser(email: string, password: string): Promise<UserEntity> {
    const user = await this.userService.findByEmailWithPassword(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isLocked) {
      throw new ForbiddenException('Account temporarily locked due to too many failed attempts');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Password login not available for this account');
    }

    const isValid = await argon2.verify(user.passwordHash, password);

    if (!isValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on success
    if (user.failedLoginAttempts > 0) {
      await this.userService.resetFailedAttempts(user.id);
    }

    return user;
  }

  async login(user: UserEntity, ipAddress?: string, userAgent?: string): Promise<LoginResponseDto> {
    await this.userService.updateLastLogin(user.id);
    return this.generateTokenPair(user, ipAddress, userAgent);
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
  ): Promise<LoginResponseDto> {
    const tokenHash = await argon2.hash(refreshToken);
    const storedToken = await this.refreshTokenRepo.findOne({
      where: { userId, tokenHash, isRevoked: false },
      relations: ['user'],
    });

    if (!storedToken || !storedToken.isValid) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate: revoke old token, issue new pair (prevents token reuse attacks)
    storedToken.isRevoked = true;
    await this.refreshTokenRepo.save(storedToken);

    return this.generateTokenPair(storedToken.user, ipAddress);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.refreshTokenRepo.update(
        { userId, isRevoked: false },
        { isRevoked: true },
      );
    }
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.refreshTokenRepo.update({ userId }, { isRevoked: true });
  }

  private async generateTokenPair(
    user: UserEntity,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponseDto> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshTokenValue = uuid();
    const refreshTokenHash = await argon2.hash(refreshTokenValue);
    const _refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        tokenHash: refreshTokenHash,
        userId: user.id,
        expiresAt,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      }),
    );

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  private async handleFailedLogin(user: UserEntity): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
      await this.userService.lockAccount(user.id, lockedUntil, attempts);
      this.logger.warn({ userId: user.id }, 'Account locked after too many failed attempts');
    } else {
      await this.userService.incrementFailedAttempts(user.id, attempts);
    }
  }
}
