import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest } from 'express';

import type { UserEntity } from '../user/entities/user.entity';

import { AuditService } from './audit.service';
import { AuthService } from './auth.service';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { AuditAction } from './entities/audit-log.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';


interface AuthenticatedRequest extends ExpressRequest {
  user: UserEntity;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: LoginResponseDto })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async register(@Body() dto: RegisterDto, @Request() req: ExpressRequest): Promise<LoginResponseDto> {
    const result = await this.authService.register(dto);
    await this.auditService.log({
      userId: result.user.id,
      action: AuditAction.REGISTER,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });
    return result;
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async login(@Request() req: AuthenticatedRequest): Promise<LoginResponseDto> {
    const result = await this.authService.login(req.user, req.ip, req.headers['user-agent']);
    await this.auditService.log({
      userId: req.user.id,
      action: AuditAction.LOGIN,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });
    return result;
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed', type: LoginResponseDto })
  @ApiBearerAuth()
  async refreshTokens(@Request() req: AuthenticatedRequest): Promise<LoginResponseDto> {
    const refreshToken = req.headers.authorization?.replace('Bearer ', '') ?? '';
    return this.authService.refreshTokens(req.user.id, refreshToken, req.ip);
  }

  @Delete('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiBearerAuth()
  async logout(@Request() req: AuthenticatedRequest): Promise<void> {
    const refreshToken = req.headers['x-refresh-token'] as string | undefined;
    await this.authService.logout(req.user.id, refreshToken);
    await this.auditService.log({
      userId: req.user.id,
      action: AuditAction.LOGOUT,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke all sessions (logout everywhere)' })
  @ApiBearerAuth()
  async revokeAllSessions(@Request() req: AuthenticatedRequest): Promise<void> {
    await this.authService.revokeAllSessions(req.user.id);
  }
}
