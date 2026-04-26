import 'reflect-metadata';
jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common') as Record<string, unknown>;
  return { ...actual, Version: () => () => {} };
});
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { WorkflowStatus } from './entities/workflow.entity';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

function makeWorkflow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wf-1',
    name: 'Test Workflow',
    tenantId: 'tenant-1',
    status: WorkflowStatus.ACTIVE,
    createdBy: 'user-1',
    steps: [],
    ...overrides,
  };
}

function makeRequest() {
  return { user: { id: 'user-1', tenantId: 'tenant-1' } } as any;
}

describe('WorkflowController', () => {
  let controller: WorkflowController;
  let workflowService: jest.Mocked<WorkflowService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowController],
      providers: [
        {
          provide: WorkflowService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            activate: jest.fn(),
            trigger: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WorkflowController>(WorkflowController);
    workflowService = module.get(WorkflowService);
  });

  describe('findAll', () => {
    it('lists workflows scoped to tenant with pagination', async () => {
      const paginated = { items: [makeWorkflow()], total: 1, page: 1, limit: 20, pages: 1 };
      workflowService.findAll.mockResolvedValue(paginated as any);

      const result = await controller.findAll(makeRequest(), 1, 20);

      expect(workflowService.findAll).toHaveBeenCalledWith('tenant-1', 1, 20);
      expect(result).toBe(paginated);
    });

    it('caps limit at 100', async () => {
      workflowService.findAll.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100, pages: 0 } as any);
      await controller.findAll(makeRequest(), 1, 200);
      expect(workflowService.findAll).toHaveBeenCalledWith('tenant-1', 1, 100);
    });
  });

  describe('findOne', () => {
    it('returns workflow by id and tenant', async () => {
      const wf = makeWorkflow();
      workflowService.findOne.mockResolvedValue(wf as any);
      const result = await controller.findOne(makeRequest(), 'wf-1');
      expect(workflowService.findOne).toHaveBeenCalledWith('wf-1', 'tenant-1');
      expect(result).toBe(wf);
    });
  });

  describe('create', () => {
    it('creates workflow with user and tenant from request', async () => {
      const wf = makeWorkflow();
      workflowService.create.mockResolvedValue(wf as any);
      const dto = { name: 'New', description: 'desc', steps: [] } as any;
      await controller.create(dto, makeRequest());
      expect(workflowService.create).toHaveBeenCalledWith(dto, 'user-1', 'tenant-1');
    });
  });

  describe('update', () => {
    it('updates workflow', async () => {
      const wf = makeWorkflow({ name: 'Updated' });
      workflowService.update.mockResolvedValue(wf as any);
      await controller.update('wf-1', { name: 'Updated' } as any, makeRequest());
      expect(workflowService.update).toHaveBeenCalledWith('wf-1', { name: 'Updated' }, 'user-1', 'tenant-1');
    });
  });

  describe('delete', () => {
    it('deletes workflow', async () => {
      workflowService.delete.mockResolvedValue(undefined);
      await controller.delete('wf-1', makeRequest());
      expect(workflowService.delete).toHaveBeenCalledWith('wf-1', 'tenant-1');
    });
  });

  describe('activate', () => {
    it('activates workflow', async () => {
      const wf = makeWorkflow({ status: WorkflowStatus.ACTIVE });
      workflowService.activate.mockResolvedValue(wf as any);
      const _result = await controller.activate('wf-1', makeRequest());
      expect(workflowService.activate).toHaveBeenCalledWith('wf-1', 'tenant-1');
    });
  });

  describe('trigger', () => {
    it('triggers workflow run with payload', async () => {
      const runResult = { workflowId: 'wf-1', success: true, steps: [], executedAt: new Date() };
      workflowService.trigger.mockResolvedValue(runResult as any);
      const result = await controller.trigger('wf-1', { key: 'value' }, makeRequest());
      expect(workflowService.trigger).toHaveBeenCalledWith('wf-1', 'tenant-1', { key: 'value' });
      expect(result).toBe(runResult);
    });
  });

  describe('events (SSE)', () => {
    it('returns an observable that emits heartbeat events', (done) => {
      const obs = controller.events('wf-1');
      const sub = obs.subscribe({
        next: (event: MessageEvent) => {
          const data = JSON.parse(event.data);
          expect(data.workflowId).toBe('wf-1');
          expect(data.type).toBe('heartbeat');
          sub.unsubscribe();
          done();
        },
      });
    });
  });
});
