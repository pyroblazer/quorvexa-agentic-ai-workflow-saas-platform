import { NotFoundException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UserProfileEntity, UserProfileStatus } from './entities/user-profile.entity';
import { UserService } from './user.service';

function makeProfile(overrides: Partial<UserProfileEntity> = {}): UserProfileEntity {
  const p = new UserProfileEntity();
  p.id = 'profile-1';
  p.userId = 'user-1';
  p.firstName = 'Test';
  p.lastName = 'User';
  p.avatarUrl = null;
  p.phone = null;
  p.title = null;
  p.department = null;
  p.bio = null;
  p.socialLinks = {};
  p.tenantId = 'tenant-1';
  p.status = UserProfileStatus.ACTIVE;
  p.lastActiveAt = null;
  p.createdAt = new Date();
  p.updatedAt = new Date();
  return Object.assign(p, overrides);
}

describe('UserService', () => {
  let service: UserService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn().mockImplementation((data) => Object.assign(new UserProfileEntity(), data)),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
      remove: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserProfileEntity), useValue: repo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('create', () => {
    it('creates a new user profile', async () => {
      repo.findOne.mockResolvedValue(null);
      const dto = { userId: 'user-2', firstName: 'New', lastName: 'User', tenantId: 'tenant-1' };

      const _result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalled();
    });

    it('throws ConflictException when profile already exists', async () => {
      repo.findOne.mockResolvedValue(makeProfile());

      await expect(service.create({ userId: 'user-1', firstName: 'Test', lastName: 'User', tenantId: 'tenant-1' }))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns paginated profiles', async () => {
      const profiles = [makeProfile()];
      repo.createQueryBuilder().getManyAndCount.mockResolvedValue([profiles, 1]);

      const result = await service.findAll('tenant-1', {});

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('searches by name and title', async () => {
      const qb = repo.createQueryBuilder();
      await service.findAll('tenant-1', { search: 'Alice' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(profile.firstName ILIKE :search OR profile.lastName ILIKE :search OR profile.title ILIKE :search)',
        { search: '%Alice%' },
      );
    });

    it('filters by status', async () => {
      const qb = repo.createQueryBuilder();
      await service.findAll('tenant-1', { status: UserProfileStatus.ACTIVE });

      expect(qb.andWhere).toHaveBeenCalledWith('profile.status = :status', { status: UserProfileStatus.ACTIVE });
    });
  });

  describe('findOne', () => {
    it('returns profile when found', async () => {
      repo.findOne.mockResolvedValue(makeProfile());

      const result = await service.findOne('profile-1', 'tenant-1');
      expect(result.id).toBe('profile-1');
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUserId', () => {
    it('returns profile for user', async () => {
      repo.findOne.mockResolvedValue(makeProfile());

      const result = await service.findByUserId('user-1');
      expect(result.userId).toBe('user-1');
    });

    it('throws NotFoundException when user has no profile', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findByUserId('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates profile fields', async () => {
      repo.findOne.mockResolvedValue(makeProfile());

      await service.update('profile-1', 'tenant-1', { firstName: 'Updated' });

      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('removes the profile', async () => {
      repo.findOne.mockResolvedValue(makeProfile());

      await service.delete('profile-1', 'tenant-1');

      expect(repo.remove).toHaveBeenCalled();
    });
  });

  describe('suspend', () => {
    it('sets status to SUSPENDED', async () => {
      const profile = makeProfile();
      repo.findOne.mockResolvedValue(profile);
      repo.save.mockImplementation(async (p: any) => p);

      const result = await service.suspend('profile-1', 'tenant-1');

      expect(result.status).toBe(UserProfileStatus.SUSPENDED);
    });
  });

  describe('activate', () => {
    it('sets status to ACTIVE', async () => {
      const profile = makeProfile({ status: UserProfileStatus.SUSPENDED });
      repo.findOne.mockResolvedValue(profile);
      repo.save.mockImplementation(async (p: any) => p);

      const result = await service.activate('profile-1', 'tenant-1');

      expect(result.status).toBe(UserProfileStatus.ACTIVE);
    });
  });

  describe('updateLastActive', () => {
    it('updates lastActiveAt timestamp', async () => {
      await service.updateLastActive('user-1');

      expect(repo.update).toHaveBeenCalledWith({ userId: 'user-1' }, { lastActiveAt: expect.any(Date) });
    });
  });
});
