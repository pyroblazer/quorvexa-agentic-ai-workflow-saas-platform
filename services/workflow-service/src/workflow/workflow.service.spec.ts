import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { WorkflowStepEntity, StepType, StepStatus } from './entities/workflow-step.entity';
import { WorkflowEntity, WorkflowStatus } from './entities/workflow.entity';
import { WorkflowRunService } from './workflow-run.service';
import { WorkflowService } from './workflow.service';

function makeWorkflow(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
  const wf = new WorkflowEntity();
  wf.id = 'wf-uuid-1';
  wf.tenantId = 'tenant-1';
  wf.createdBy = 'user-1';
  wf.name = 'Test Workflow';
  wf.description = 'A test workflow';
  wf.status = WorkflowStatus.ACTIVE;
  wf.triggerType = 'manual' as any;
  wf.cronExpression = null;
  wf.webhookSecret = null;
  wf.metadata = {};
  wf.runCount = 0;
  wf.lastRunAt = null;
  wf.steps = [];
  wf.createdAt = new Date();
  wf.updatedAt = new Date();
  return Object.assign(wf, overrides);
}

function makeStep(overrides: Partial<WorkflowStepEntity> = {}): WorkflowStepEntity {
  const step = new WorkflowStepEntity();
  step.id = 'step-uuid-1';
  step.workflowId = 'wf-uuid-1';
  step.name = 'Test Step';
  step.type = StepType.ACTION;
  step.order = 0;
  step.config = { action: 'test' };
  step.lastOutput = null;
  step.lastStatus = StepStatus.PENDING;
  step.maxRetries = 3;
  step.retryDelayMs = 1000;
  return Object.assign(step, overrides);
}

describe('WorkflowService', () => {
  let service: WorkflowService;
  let workflowRepo: any;
  let stepRepo: any;
  let dataSource: any;
  let runService: any;

  beforeEach(async () => {
    workflowRepo = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    stepRepo = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn((cb) => cb({
        create: jest.fn().mockImplementation((_, data) => data),
        save: jest.fn().mockImplementation((data) => {
          if (Array.isArray(data)) return Promise.resolve(data);
          return Promise.resolve({ ...data, id: data.id ?? 'wf-new' });
        }),
        remove: jest.fn().mockResolvedValue(undefined),
      })),
    };

    runService = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: getRepositoryToken(WorkflowEntity), useValue: workflowRepo },
        { provide: getRepositoryToken(WorkflowStepEntity), useValue: stepRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: WorkflowRunService, useValue: runService },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
  });

  describe('findAll', () => {
    it('returns paginated workflows for a tenant', async () => {
      const workflows = [makeWorkflow()];
      workflowRepo.findAndCount.mockResolvedValue([workflows, 1]);

      const result = await service.findAll('tenant-1', 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.pages).toBe(1);
    });

    it('calculates pagination correctly', async () => {
      workflowRepo.findAndCount.mockResolvedValue([[], 45]);

      const result = await service.findAll('tenant-1', 2, 20);

      expect(result.page).toBe(2);
      expect(result.pages).toBe(3);
    });
  });

  describe('findOne', () => {
    it('returns workflow with steps', async () => {
      const wf = makeWorkflow({ steps: [makeStep()] });
      workflowRepo.findOne.mockResolvedValue(wf);

      const result = await service.findOne('wf-uuid-1', 'tenant-1');

      expect(result.id).toBe('wf-uuid-1');
      expect(result.steps).toHaveLength(1);
    });

    it('throws NotFoundException when workflow not found', async () => {
      workflowRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates workflow with steps in a transaction', async () => {
      const dto = {
        name: 'New Workflow',
        description: 'Test',
        steps: [{ name: 'Step 1', type: StepType.ACTION, order: 0, config: {} }],
      };

      const createdWf = makeWorkflow({ ...dto, id: 'wf-new' } as any);
      workflowRepo.findOne.mockResolvedValue(createdWf);
      dataSource.transaction = jest.fn((cb) =>
        cb({
          create: jest.fn().mockReturnValue(createdWf),
          save: jest.fn().mockResolvedValue(createdWf),
        }),
      );

      const _result = await service.create(dto as any, 'user-1', 'tenant-1');

      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates workflow properties', async () => {
      const wf = makeWorkflow();
      const updatedWf = { ...wf, name: 'Updated' };

      workflowRepo.findOne
        .mockResolvedValueOnce(wf)
        .mockResolvedValueOnce(updatedWf);

      const result = await service.update('wf-uuid-1', { name: 'Updated' }, 'user-1', 'tenant-1');

      expect(result.name).toBe('Updated');
      expect(workflowRepo.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('delete', () => {
    it('removes the workflow', async () => {
      const wf = makeWorkflow();
      workflowRepo.findOne.mockResolvedValue(wf);
      workflowRepo.remove.mockResolvedValue(wf);

      await service.delete('wf-uuid-1', 'tenant-1');

      expect(workflowRepo.remove).toHaveBeenCalledWith(wf);
    });
  });

  describe('activate', () => {
    it('changes status to ACTIVE', async () => {
      const wf = makeWorkflow({ status: WorkflowStatus.DRAFT });
      workflowRepo.findOne.mockResolvedValue(wf);
      workflowRepo.save.mockResolvedValue({ ...wf, status: WorkflowStatus.ACTIVE });

      const result = await service.activate('wf-uuid-1', 'tenant-1');

      expect(result.status).toBe(WorkflowStatus.ACTIVE);
    });
  });

  describe('trigger', () => {
    it('executes a workflow run when active', async () => {
      const wf = makeWorkflow({ status: WorkflowStatus.ACTIVE });
      workflowRepo.findOne.mockResolvedValue(wf);
      runService.execute.mockResolvedValue({ workflowId: wf.id, success: true, steps: [] });

      const result = await service.trigger('wf-uuid-1', 'tenant-1', { test: true });

      expect(runService.execute).toHaveBeenCalledWith(wf, { test: true });
      expect(result.success).toBe(true);
    });

    it('throws ForbiddenException when workflow is not active', async () => {
      const wf = makeWorkflow({ status: WorkflowStatus.DRAFT });
      workflowRepo.findOne.mockResolvedValue(wf);

      await expect(service.trigger('wf-uuid-1', 'tenant-1', {})).rejects.toThrow(ForbiddenException);
    });
  });
});

describe('WorkflowRunService', () => {
  let runService: WorkflowRunService;
  let stepRepo: any;

  beforeEach(async () => {
    stepRepo = { update: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowRunService,
        { provide: getRepositoryToken(WorkflowStepEntity), useValue: stepRepo },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('test-token') } },
      ],
    }).compile();

    runService = module.get<WorkflowRunService>(WorkflowRunService);
  });

  describe('execute', () => {
    it('executes steps sequentially and returns results', async () => {
      const step = makeStep({ type: StepType.DELAY, config: { delayMs: 10 } });
      const wf = makeWorkflow({ steps: [step] });

      const result = await runService.execute(wf, { trigger: true });

      expect(result.workflowId).toBe(wf.id);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].status).toBe(StepStatus.COMPLETED);
      expect(result.success).toBe(true);
    });

    it('stops execution on step failure', async () => {
      const step1 = makeStep({ type: StepType.HTTP_REQUEST, config: { url: 'http://invalid-host:99999/fail' } });
      const step2 = makeStep({ id: 'step-2', order: 1, type: StepType.ACTION });
      const wf = makeWorkflow({ steps: [step1, step2] });

      const result = await runService.execute(wf, {});

      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].status).toBe(StepStatus.FAILED);
      expect(result.success).toBe(false);
    });

    it('handles condition steps', async () => {
      const step = makeStep({ type: StepType.CONDITION, config: { condition: 'trigger' } });
      const wf = makeWorkflow({ steps: [step] });

      const result = await runService.execute(wf, { trigger: true });

      expect(result.steps[0].output).toMatchObject({ result: true, branch: 'true' });
    });

    it('handles transform steps', async () => {
      const step = makeStep({
        type: StepType.TRANSFORM,
        config: { mapping: { userName: 'trigger.name' } },
      });
      const wf = makeWorkflow({ steps: [step] });

      const result = await runService.execute(wf, { name: 'Alice' });

      expect(result.steps[0].output).toMatchObject({ userName: 'Alice' });
    });
  });
});
