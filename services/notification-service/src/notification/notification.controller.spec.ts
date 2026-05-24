import 'reflect-metadata';
jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common') as Record<string, unknown>;
  return { ...actual, Version: () => () => {} };
});
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 'notif-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    channel: 'in_app',
    status: 'pending',
    subject: 'Test',
    body: 'Hello',
    ...overrides,
  };
}

function makeRequest() {
  return { user: { sub: 'user-1', id: 'user-1', tenantId: 'tenant-1' } } as any;
}

describe('NotificationController', () => {
  let controller: NotificationController;
  let notifService: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findByUser: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            markAsRead: jest.fn(),
            retry: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationController>(NotificationController);
    notifService = module.get(NotificationService);
  });

  describe('send', () => {
    it('creates a notification scoped to tenant', async () => {
      const notif = makeNotification();
      notifService.create.mockResolvedValue(notif as any);
      const dto = { userId: 'user-1', channel: 'in_app', subject: 'Hi', body: 'Hello' } as any;
      const result = await controller.send(dto, makeRequest());
      expect(notifService.create).toHaveBeenCalledWith(dto, 'tenant-1');
      expect(result).toBe(notif);
    });
  });

  describe('findAll', () => {
    it('lists notifications for tenant', async () => {
      const result = { items: [], total: 0, page: 1, limit: 20 };
      notifService.findAll.mockResolvedValue(result as any);
      await controller.findAll(makeRequest(), {} as any);
      expect(notifService.findAll).toHaveBeenCalledWith('tenant-1', {});
    });
  });

  describe('findMine', () => {
    it('lists notifications for current user', async () => {
      const result = { items: [], total: 0, page: 1, limit: 20 };
      notifService.findByUser.mockResolvedValue(result as any);
      await controller.findMine(makeRequest(), {} as any);
      expect(notifService.findByUser).toHaveBeenCalledWith('user-1', {});
    });
  });

  describe('findOne', () => {
    it('gets notification by id scoped to tenant', async () => {
      const notif = makeNotification();
      notifService.findOne.mockResolvedValue(notif as any);
      const result = await controller.findOne('notif-1', makeRequest());
      expect(notifService.findOne).toHaveBeenCalledWith('notif-1', 'tenant-1');
      expect(result).toBe(notif);
    });
  });

  describe('update', () => {
    it('updates notification', async () => {
      const notif = makeNotification({ status: 'sent' });
      notifService.update.mockResolvedValue(notif as any);
      await controller.update('notif-1', { status: 'sent' } as any, makeRequest());
      expect(notifService.update).toHaveBeenCalledWith('notif-1', 'tenant-1', { status: 'sent' });
    });
  });

  describe('markRead', () => {
    it('marks notification as read', async () => {
      const notif = makeNotification({ readAt: new Date() });
      notifService.markAsRead.mockResolvedValue(notif as any);
      const _result = await controller.markRead('notif-1', makeRequest());
      expect(notifService.markAsRead).toHaveBeenCalledWith('notif-1', 'tenant-1');
    });
  });

  describe('retry', () => {
    it('retries failed notification', async () => {
      const notif = makeNotification({ retryCount: 1 });
      notifService.retry.mockResolvedValue(notif as any);
      await controller.retry('notif-1', makeRequest());
      expect(notifService.retry).toHaveBeenCalledWith('notif-1', 'tenant-1');
    });
  });

  describe('delete', () => {
    it('deletes notification', async () => {
      notifService.delete.mockResolvedValue(undefined);
      await controller.delete('notif-1', makeRequest());
      expect(notifService.delete).toHaveBeenCalledWith('notif-1', 'tenant-1');
    });
  });
});
