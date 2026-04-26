import 'reflect-metadata';
jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common') as Record<string, unknown>;
  return { ...actual, Version: () => () => {} };
});
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';

function makeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tmpl-1',
    tenantId: 'tenant-1',
    name: 'Welcome Email',
    subject: 'Welcome, {{firstName}}!',
    bodyHtml: '<p>Hello {{firstName}}</p>',
    channel: 'email',
    ...overrides,
  };
}

function makeRequest() {
  return { user: { id: 'user-1', tenantId: 'tenant-1' } } as any;
}

describe('TemplateController', () => {
  let controller: TemplateController;
  let templateService: jest.Mocked<TemplateService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplateController],
      providers: [
        {
          provide: TemplateService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            render: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TemplateController>(TemplateController);
    templateService = module.get(TemplateService);
  });

  describe('findAll', () => {
    it('lists templates for tenant', async () => {
      const result = { items: [makeTemplate()], total: 1 };
      templateService.findAll.mockResolvedValue(result as any);
      await controller.findAll(makeRequest(), 1, 20);
      expect(templateService.findAll).toHaveBeenCalledWith('tenant-1', 1, 20);
    });
  });

  describe('findOne', () => {
    it('returns template by id', async () => {
      const tmpl = makeTemplate();
      templateService.findOne.mockResolvedValue(tmpl as any);
      const result = await controller.findOne('tmpl-1', makeRequest());
      expect(templateService.findOne).toHaveBeenCalledWith('tmpl-1', 'tenant-1');
      expect(result).toBe(tmpl);
    });
  });

  describe('create', () => {
    it('creates template scoped to tenant', async () => {
      const tmpl = makeTemplate();
      templateService.create.mockResolvedValue(tmpl as any);
      const dto = { name: 'Welcome Email', subject: 'Hi', channel: 'email' } as any;
      await controller.create(dto, makeRequest());
      expect(templateService.create).toHaveBeenCalledWith(dto, 'tenant-1');
    });
  });

  describe('update', () => {
    it('updates template by id and tenant', async () => {
      const tmpl = makeTemplate({ subject: 'Updated Subject' });
      templateService.update.mockResolvedValue(tmpl as any);
      await controller.update('tmpl-1', { subject: 'Updated Subject' } as any, makeRequest());
      expect(templateService.update).toHaveBeenCalledWith('tmpl-1', 'tenant-1', { subject: 'Updated Subject' });
    });
  });

  describe('delete', () => {
    it('deletes template', async () => {
      templateService.delete.mockResolvedValue(undefined);
      await controller.delete('tmpl-1', makeRequest());
      expect(templateService.delete).toHaveBeenCalledWith('tmpl-1', 'tenant-1');
    });
  });

  describe('render', () => {
    it('renders template with variables', async () => {
      const rendered = { subject: 'Welcome, Alice!', bodyHtml: '<p>Hello Alice</p>' };
      templateService.render.mockResolvedValue(rendered as any);
      await controller.render('tmpl-1', { firstName: 'Alice' }, makeRequest());
      expect(templateService.render).toHaveBeenCalledWith('tmpl-1', 'tenant-1', { firstName: 'Alice' });
    });
  });
});
