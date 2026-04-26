import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { NotificationEntity, NotificationChannel, NotificationStatus } from './entities/notification.entity';
import { NotificationService } from './notification.service';

// Mock nodemailer at module level
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
  }),
}));

function makeNotification(overrides: Partial<NotificationEntity> = {}): NotificationEntity {
  const n = new NotificationEntity();
  n.id = 'notif-1';
  n.userId = 'user-1';
  n.tenantId = 'tenant-1';
  n.channel = NotificationChannel.EMAIL;
  n.status = NotificationStatus.PENDING;
  n.subject = 'Test Subject';
  n.body = 'Test body';
  n.recipient = 'test@example.com';
  n.metadata = {};
  n.retryCount = 0;
  n.maxRetries = 3;
  n.sentAt = null;
  n.readAt = null;
  n.errorMessage = null;
  n.templateId = null;
  n.createdAt = new Date();
  n.updatedAt = new Date();
  return Object.assign(n, overrides);
}

describe('NotificationService', () => {
  let service: NotificationService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn().mockImplementation((data) => Object.assign(new NotificationEntity(), { status: NotificationStatus.PENDING }, data)),
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(NotificationEntity), useValue: repo },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('create', () => {
    it('creates a notification and queues delivery', async () => {
      const dto = {
        userId: 'user-1',
        channel: NotificationChannel.EMAIL,
        subject: 'Welcome',
        body: 'Hello!',
        recipient: 'user@example.com',
      };

      const result = await service.create(dto, 'tenant-1');

      expect(result.tenantId).toBe('tenant-1');
      expect(result.status).toBe(NotificationStatus.PENDING);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
    });
  });

  describe('findAll', () => {
    it('returns paginated notifications for a tenant', async () => {
      const notifs = [makeNotification()];
      repo.createQueryBuilder().getManyAndCount.mockResolvedValue([notifs, 1]);

      const result = await service.findAll('tenant-1', { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('filters by status', async () => {
      const qb = repo.createQueryBuilder();
      await service.findAll('tenant-1', { status: NotificationStatus.SENT });

      expect(qb.andWhere).toHaveBeenCalledWith('n.status = :status', { status: NotificationStatus.SENT });
    });

    it('filters by channel', async () => {
      const qb = repo.createQueryBuilder();
      await service.findAll('tenant-1', { channel: NotificationChannel.EMAIL });

      expect(qb.andWhere).toHaveBeenCalledWith('n.channel = :channel', { channel: NotificationChannel.EMAIL });
    });
  });

  describe('findOne', () => {
    it('returns notification when found', async () => {
      const notif = makeNotification();
      repo.findOne.mockResolvedValue(notif);

      const result = await service.findOne('notif-1', 'tenant-1');
      expect(result.id).toBe('notif-1');
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates notification fields', async () => {
      const notif = makeNotification();
      repo.findOne.mockResolvedValue(notif);

      const _result = await service.update('notif-1', 'tenant-1', {
        status: NotificationStatus.FAILED,
        errorMessage: 'SMTP timeout',
      });

      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('removes the notification', async () => {
      const notif = makeNotification();
      repo.findOne.mockResolvedValue(notif);

      await service.delete('notif-1', 'tenant-1');

      expect(repo.remove).toHaveBeenCalledWith(notif);
    });
  });

  describe('markAsRead', () => {
    it('sets status to READ and timestamps readAt', async () => {
      const notif = makeNotification();
      repo.findOne.mockResolvedValue(notif);
      repo.save.mockImplementation(async (n: any) => n);

      const result = await service.markAsRead('notif-1', 'tenant-1');

      expect(result.status).toBe(NotificationStatus.READ);
      expect(result.readAt).toBeInstanceOf(Date);
    });
  });

  describe('findByUser', () => {
    it('returns paginated notifications for a specific user', async () => {
      const notifs = [makeNotification()];
      repo.createQueryBuilder().getManyAndCount.mockResolvedValue([notifs, 1]);

      const result = await service.findByUser('user-1', { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
    });
  });

  describe('retry', () => {
    it('retries delivery for failed notification', async () => {
      const notif = makeNotification({ status: NotificationStatus.FAILED, retryCount: 1 });
      repo.findOne.mockResolvedValue(notif);
      repo.save.mockImplementation(async (n: any) => n);

      const result = await service.retry('notif-1', 'tenant-1');

      expect(result.retryCount).toBe(2);
    });

    it('rejects retry when max retries exceeded', async () => {
      const notif = makeNotification({ retryCount: 3, maxRetries: 3 });
      repo.findOne.mockResolvedValue(notif);

      await expect(service.retry('notif-1', 'tenant-1')).rejects.toThrow();
    });
  });
});
