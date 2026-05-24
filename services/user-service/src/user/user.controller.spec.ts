import 'reflect-metadata';
jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common') as Record<string, unknown>;
  return { ...actual, Version: () => () => {} };
});
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { UserProfileStatus } from './entities/user-profile.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';



function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    firstName: 'Test',
    lastName: 'User',
    status: UserProfileStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    user: { sub: 'user-1', id: 'user-1', tenantId: 'tenant-1', role: 'member' },
    ...overrides,
  } as any;
}

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            findAll: jest.fn(),
            findByUserId: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            updateByUserId: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            suspend: jest.fn(),
            activate: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  describe('findAll', () => {
    it('calls findAll with tenantId from request', async () => {
      userService.findAll.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, pages: 0 });
      const req = makeRequest();
      await controller.findAll(req, {} as any);
      expect(userService.findAll).toHaveBeenCalledWith('tenant-1', {});
    });
  });

  describe('findMe', () => {
    it('returns current user profile', async () => {
      const profile = makeProfile();
      userService.findByUserId.mockResolvedValue(profile as any);
      const req = makeRequest();
      const result = await controller.findMe(req);
      expect(result).toBe(profile);
      expect(userService.findByUserId).toHaveBeenCalledWith('user-1');
    });

    it('throws NotFoundException when profile missing', async () => {
      userService.findByUserId.mockRejectedValue(new NotFoundException());
      await expect(controller.findMe(makeRequest())).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('returns profile by id scoped to tenant', async () => {
      const profile = makeProfile();
      userService.findOne.mockResolvedValue(profile as any);
      const _result = await controller.findOne(makeRequest(), 'profile-1');
      expect(userService.findOne).toHaveBeenCalledWith('profile-1', 'tenant-1');
    });
  });

  describe('create', () => {
    it('creates profile with tenantId from request if not provided', async () => {
      const profile = makeProfile();
      userService.create.mockResolvedValue(profile as any);
      const dto = { userId: 'user-2', firstName: 'New', lastName: 'User' } as any;
      await controller.create(dto, makeRequest());
      expect(userService.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-1' }),
      );
    });
  });

  describe('updateMe', () => {
    it('updates current user profile', async () => {
      const updated = makeProfile({ firstName: 'Updated' });
      userService.updateByUserId.mockResolvedValue(updated as any);
      const req = makeRequest();
      const _result = await controller.updateMe({ firstName: 'Updated' } as any, req);
      expect(userService.updateByUserId).toHaveBeenCalledWith('user-1', { firstName: 'Updated' });
    });
  });

  describe('update', () => {
    it('updates profile by id and tenant', async () => {
      const updated = makeProfile({ firstName: 'Changed' });
      userService.update.mockResolvedValue(updated as any);
      await controller.update('profile-1', { firstName: 'Changed' } as any, makeRequest());
      expect(userService.update).toHaveBeenCalledWith('profile-1', 'tenant-1', { firstName: 'Changed' });
    });
  });

  describe('delete', () => {
    it('deletes profile scoped to tenant', async () => {
      userService.delete.mockResolvedValue(undefined);
      await controller.delete('profile-1', makeRequest());
      expect(userService.delete).toHaveBeenCalledWith('profile-1', 'tenant-1');
    });
  });

  describe('suspend', () => {
    it('suspends user profile', async () => {
      const suspended = makeProfile({ status: UserProfileStatus.SUSPENDED });
      userService.suspend.mockResolvedValue(suspended as any);
      const _result = await controller.suspend('profile-1', makeRequest());
      expect(userService.suspend).toHaveBeenCalledWith('profile-1', 'tenant-1');
    });
  });

  describe('activate', () => {
    it('activates user profile', async () => {
      const active = makeProfile({ status: UserProfileStatus.ACTIVE });
      userService.activate.mockResolvedValue(active as any);
      await controller.activate('profile-1', makeRequest());
      expect(userService.activate).toHaveBeenCalledWith('profile-1', 'tenant-1');
    });
  });
});
