import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UserEntity, UserRole, UserStatus } from './entities/user.entity';
import { UserService } from './user.service';

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  const user = new UserEntity();
  user.id = 'user-uuid-1';
  user.email = 'test@example.com';
  user.passwordHash = null;
  user.firstName = 'Test';
  user.lastName = 'User';
  user.role = UserRole.MEMBER;
  user.status = UserStatus.ACTIVE;
  user.tenantId = 'default';
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  return Object.assign(user, overrides);
}

describe('UserService (auth-service)', () => {
  let service: UserService;
  let userRepo: jest.Mocked<any>;

  beforeEach(async () => {
    userRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'user-uuid-1', ...data })),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('create', () => {
    it('creates and saves a new user', async () => {
      const params = {
        email: 'new@example.com',
        passwordHash: 'hashed',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        tenantId: 'default',
      };

      const _result = await service.create(params);

      expect(userRepo.create).toHaveBeenCalledWith(params);
      expect(userRepo.save).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.findById('user-uuid-1');
      expect(result).toBe(user);
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 'user-uuid-1' } });
    });

    it('returns null when not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const result = await service.findById('missing');
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('returns user when found', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('test@example.com');
      expect(result).toBe(user);
    });

    it('returns null when not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const result = await service.findByEmail('nope@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findByEmailWithPassword', () => {
    it('uses createQueryBuilder and addSelect for passwordHash', async () => {
      const user = makeUser({ passwordHash: 'hash123' });
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(user),
      };
      userRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByEmailWithPassword('test@example.com');

      expect(qb.addSelect).toHaveBeenCalledWith('user.passwordHash');
      expect(result).toBe(user);
    });
  });

  describe('updateLastLogin', () => {
    it('calls update with lastLoginAt', async () => {
      await service.updateLastLogin('user-uuid-1');
      expect(userRepo.update).toHaveBeenCalledWith('user-uuid-1', { lastLoginAt: expect.any(Date) });
    });
  });

  describe('incrementFailedAttempts', () => {
    it('updates failedLoginAttempts', async () => {
      await service.incrementFailedAttempts('user-uuid-1', 3);
      expect(userRepo.update).toHaveBeenCalledWith('user-uuid-1', { failedLoginAttempts: 3 });
    });
  });

  describe('resetFailedAttempts', () => {
    it('resets attempts and clears lockedUntil', async () => {
      await service.resetFailedAttempts('user-uuid-1');
      expect(userRepo.update).toHaveBeenCalledWith('user-uuid-1', {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    });
  });

  describe('lockAccount', () => {
    it('sets lockedUntil and failedLoginAttempts', async () => {
      const lockDate = new Date();
      await service.lockAccount('user-uuid-1', lockDate, 5);
      expect(userRepo.update).toHaveBeenCalledWith('user-uuid-1', {
        lockedUntil: lockDate,
        failedLoginAttempts: 5,
      });
    });
  });

  describe('findOrCreateOAuthUser', () => {
    it('returns existing OAuth user', async () => {
      const existing = makeUser({ oauthProvider: 'google', oauthId: 'g-123' });
      userRepo.findOne.mockResolvedValue(existing);

      const result = await service.findOrCreateOAuthUser({
        email: 'oauth@example.com',
        firstName: 'OAuth',
        lastName: 'User',
        oauthProvider: 'google',
        oauthId: 'g-123',
        tenantId: 'default',
      });

      expect(result).toBe(existing);
    });

    it('creates new OAuth user when not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const newUser = makeUser({ oauthProvider: 'google', oauthId: 'g-new' });
      userRepo.create.mockReturnValue(newUser);
      userRepo.save.mockResolvedValue(newUser);

      const _result = await service.findOrCreateOAuthUser({
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'OAuth',
        oauthProvider: 'google',
        oauthId: 'g-new',
        tenantId: 'default',
      });

      expect(userRepo.create).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalled();
    });
  });
});
