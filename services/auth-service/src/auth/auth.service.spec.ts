import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as argon2 from 'argon2';

import { UserEntity, UserRole, UserStatus } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';

import { AuthService } from './auth.service';
import { RefreshTokenEntity } from './entities/refresh-token.entity';


jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-value'),
  verify: jest.fn().mockResolvedValue(true),
  argon2id: 2,
}));
const mockedArgon2 = argon2 as jest.Mocked<typeof argon2>;

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  const user = new UserEntity();
  user.id = 'user-uuid-1';
  user.email = 'test@example.com';
  user.passwordHash = 'hashed-password';
  user.firstName = 'Test';
  user.lastName = 'User';
  user.role = UserRole.MEMBER;
  user.status = UserStatus.ACTIVE;
  user.tenantId = 'default';
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  return Object.assign(user, overrides);
}

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let _jwtService: jest.Mocked<JwtService>;
  let _refreshTokenRepo: jest.Mocked<any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findByEmail: jest.fn(),
            findByEmailWithPassword: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            updateLastLogin: jest.fn(),
            resetFailedAttempts: jest.fn(),
            incrementFailedAttempts: jest.fn(),
            lockAccount: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-jwt-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('15m'),
            getOrThrow: jest.fn().mockReturnValue('secret'),
          },
        },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: {
            create: jest.fn().mockImplementation((data) => data),
            save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'token-id', ...data })),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    _jwtService = module.get(JwtService);
    _refreshTokenRepo = module.get(getRepositoryToken(RefreshTokenEntity));

    (mockedArgon2.hash as jest.Mock).mockResolvedValue('hashed-value');
    (mockedArgon2.verify as jest.Mock).mockResolvedValue(true);
  });

  describe('register', () => {
    it('creates a new user and returns tokens', async () => {
      userService.findByEmail.mockResolvedValue(null);
      const mockUser = makeUser();
      userService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'new@example.com',
        password: 'SecureP@ss123',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBeDefined();
      expect(userService.create).toHaveBeenCalled();
    });

    it('throws ConflictException when email already registered', async () => {
      userService.findByEmail.mockResolvedValue(makeUser());

      await expect(
        service.register({
          email: 'existing@example.com',
          password: 'SecureP@ss123',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validateLocalUser', () => {
    it('returns user when credentials are valid', async () => {
      const user = makeUser();
      userService.findByEmailWithPassword.mockResolvedValue(user);
      (mockedArgon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.validateLocalUser('test@example.com', 'correct-pass');
      expect(result.email).toBe(user.email);
    });

    it('throws UnauthorizedException when user not found', async () => {
      userService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.validateLocalUser('no@example.com', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      userService.findByEmailWithPassword.mockResolvedValue(makeUser());
      (mockedArgon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.validateLocalUser('test@example.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
