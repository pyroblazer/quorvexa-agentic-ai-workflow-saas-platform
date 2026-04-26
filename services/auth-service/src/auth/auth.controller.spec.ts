import 'reflect-metadata';
jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common') as Record<string, unknown>;
  return { ...actual, Version: () => () => {} };
});
import { Test, TestingModule } from '@nestjs/testing';

import { UserRole, UserStatus } from '../user/entities/user.entity';
import type { UserEntity } from '../user/entities/user.entity';

import { AuditService } from './audit.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuditAction } from './entities/audit-log.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.MEMBER,
    status: UserStatus.ACTIVE,
    tenantId: 'default',
    failedLoginAttempts: 0,
    lockedUntil: null,
    passwordHash: 'hash',
    isLocked: false,
    emailVerifiedAt: null,
    oauthProvider: null,
    oauthId: null,
    avatarUrl: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as UserEntity;
}

function makeLoginResponse() {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: '15m',
    user: {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.MEMBER,
      tenantId: 'default',
    },
  };
}

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let auditService: jest.Mocked<AuditService>;

  const mockRequest = (overrides: Record<string, unknown> = {}) => ({
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest-test' },
    user: makeUser(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshTokens: jest.fn(),
            logout: jest.fn(),
            revokeAllSessions: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    auditService = module.get(AuditService);
  });

  describe('register', () => {
    it('registers a user and logs audit event', async () => {
      const response = makeLoginResponse();
      authService.register.mockResolvedValue(response);

      const dto = { email: 'new@example.com', password: 'pass', firstName: 'A', lastName: 'B' };
      const req = mockRequest() as any;
      const result = await controller.register(dto, req);

      expect(result).toBe(response);
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.REGISTER, success: true }),
      );
    });

    it('propagates errors from authService', async () => {
      authService.register.mockRejectedValue(new Error('Conflict'));
      await expect(
        controller.register({ email: 'x@x.com', password: 'p', firstName: 'A', lastName: 'B' }, mockRequest() as any),
      ).rejects.toThrow('Conflict');
    });
  });

  describe('login', () => {
    it('returns tokens and logs audit event', async () => {
      const response = makeLoginResponse();
      authService.login.mockResolvedValue(response);
      const req = mockRequest() as any;

      const result = await controller.login(req);

      expect(result).toBe(response);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.LOGIN, userId: 'user-1' }),
      );
    });
  });

  describe('refreshTokens', () => {
    it('extracts Bearer token and calls refreshTokens', async () => {
      const response = makeLoginResponse();
      authService.refreshTokens.mockResolvedValue(response);
      const req = mockRequest({
        headers: { authorization: 'Bearer my-refresh-token', 'user-agent': 'jest' },
      }) as any;

      const result = await controller.refreshTokens(req);

      expect(result).toBe(response);
      expect(authService.refreshTokens).toHaveBeenCalledWith('user-1', 'my-refresh-token', '127.0.0.1');
    });

    it('passes empty string when no authorization header', async () => {
      authService.refreshTokens.mockResolvedValue(makeLoginResponse());
      const req = mockRequest({ headers: {} }) as any;
      await controller.refreshTokens(req);
      expect(authService.refreshTokens).toHaveBeenCalledWith('user-1', '', '127.0.0.1');
    });
  });

  describe('logout', () => {
    it('calls logout with x-refresh-token header', async () => {
      authService.logout.mockResolvedValue(undefined);
      const req = mockRequest({
        headers: { 'x-refresh-token': 'the-token', 'user-agent': 'jest' },
      }) as any;

      await controller.logout(req);

      expect(authService.logout).toHaveBeenCalledWith('user-1', 'the-token');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.LOGOUT }),
      );
    });

    it('calls logout with undefined when no refresh token header', async () => {
      authService.logout.mockResolvedValue(undefined);
      const req = mockRequest({ headers: { 'user-agent': 'jest' } }) as any;
      await controller.logout(req);
      expect(authService.logout).toHaveBeenCalledWith('user-1', undefined);
    });
  });

  describe('revokeAllSessions', () => {
    it('calls revokeAllSessions with user id', async () => {
      authService.revokeAllSessions.mockResolvedValue(undefined);
      const req = mockRequest() as any;
      await controller.revokeAllSessions(req);
      expect(authService.revokeAllSessions).toHaveBeenCalledWith('user-1');
    });
  });
});
