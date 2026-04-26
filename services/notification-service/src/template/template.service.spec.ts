import { NotFoundException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { NotificationTemplateEntity } from './entities/notification-template.entity';
import { TemplateService } from './template.service';

function makeTemplate(overrides: Partial<NotificationTemplateEntity> = {}): NotificationTemplateEntity {
  const t = new NotificationTemplateEntity();
  t.id = 'tmpl-1';
  t.tenantId = 'tenant-1';
  t.name = 'Welcome Email';
  t.slug = 'welcome-email';
  t.subject = 'Welcome, {{name}}!';
  t.bodyTemplate = 'Hello {{name}}, welcome to Quorvexa!';
  t.channel = 'email';
  t.defaultValues = { name: 'User' };
  t.description = 'Welcome email template';
  t.isActive = true;
  t.createdAt = new Date();
  t.updatedAt = new Date();
  return Object.assign(t, overrides);
}

describe('TemplateService', () => {
  let service: TemplateService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn().mockImplementation((data) => Object.assign(new NotificationTemplateEntity(), data)),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        { provide: getRepositoryToken(NotificationTemplateEntity), useValue: repo },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
  });

  describe('create', () => {
    it('creates a new template', async () => {
      repo.findOne.mockResolvedValue(null);
      const dto = { name: 'Test', slug: 'test', subject: 'Sub', bodyTemplate: 'Body', channel: 'email' };

      const _result = await service.create(dto, 'tenant-1');

      expect(repo.create).toHaveBeenCalledWith({ ...dto, tenantId: 'tenant-1' });
    });

    it('throws ConflictException when slug already exists', async () => {
      repo.findOne.mockResolvedValue(makeTemplate());

      await expect(service.create({ name: 'Dup', slug: 'welcome-email', subject: 'S', bodyTemplate: 'B', channel: 'email' }, 'tenant-1'))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('returns paginated templates', async () => {
      const templates = [makeTemplate()];
      repo.findAndCount.mockResolvedValue([templates, 1]);

      const result = await service.findAll('tenant-1', 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('returns template when found', async () => {
      repo.findOne.mockResolvedValue(makeTemplate());

      const result = await service.findOne('tmpl-1', 'tenant-1');
      expect(result.id).toBe('tmpl-1');
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('returns template by slug', async () => {
      repo.findOne.mockResolvedValue(makeTemplate());

      const result = await service.findBySlug('welcome-email', 'tenant-1');
      expect(result.slug).toBe('welcome-email');
    });
  });

  describe('update', () => {
    it('updates template fields', async () => {
      repo.findOne.mockResolvedValue(makeTemplate());

      await service.update('tmpl-1', 'tenant-1', { subject: 'Updated Subject' });

      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('removes the template', async () => {
      repo.findOne.mockResolvedValue(makeTemplate());

      await service.delete('tmpl-1', 'tenant-1');

      expect(repo.remove).toHaveBeenCalled();
    });
  });

  describe('render', () => {
    it('renders template with variables', async () => {
      repo.findOne.mockResolvedValue(makeTemplate());

      const result = await service.render('welcome-email', 'tenant-1', { name: 'Alice' });

      expect(result.subject).toBe('Welcome, Alice!');
      expect(result.body).toBe('Hello Alice, welcome to Quorvexa!');
    });

    it('uses default values for missing variables', async () => {
      repo.findOne.mockResolvedValue(makeTemplate());

      const result = await service.render('welcome-email', 'tenant-1', {});

      expect(result.subject).toBe('Welcome, User!');
    });
  });
});
