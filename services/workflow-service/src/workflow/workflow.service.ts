import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createLogger } from '@quorvexa/observability';
import { Repository, DataSource } from 'typeorm';

import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowStepEntity } from './entities/workflow-step.entity';
import { WorkflowEntity, WorkflowStatus } from './entities/workflow.entity';
import { WorkflowRunService } from './workflow-run.service';

@Injectable()
export class WorkflowService {
  private readonly logger = createLogger('workflow-service:workflows');

  constructor(
    @InjectRepository(WorkflowEntity)
    private readonly workflowRepo: Repository<WorkflowEntity>,
    @InjectRepository(WorkflowStepEntity)
    private readonly stepRepo: Repository<WorkflowStepEntity>,
    private readonly dataSource: DataSource,
    private readonly runService: WorkflowRunService,
  ) {}

  async findAll(tenantId: string, page = 1, limit = 20) {
    const [items, total] = await this.workflowRepo.findAndCount({
      where: { tenantId },
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<WorkflowEntity> {
    const workflow = await this.workflowRepo.findOne({
      where: { id, tenantId },
      relations: ['steps'],
      order: { steps: { order: 'ASC' } },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow ${id} not found`);
    }

    return workflow;
  }

  async create(dto: CreateWorkflowDto, userId: string, tenantId: string): Promise<WorkflowEntity> {
    return this.dataSource.transaction(async (manager) => {
      const workflow = manager.create(WorkflowEntity, {
        ...dto,
        createdBy: userId,
        tenantId,
        steps: [],
      });

      const saved = await manager.save(workflow);

      if (dto.steps?.length) {
        const steps = dto.steps.map((step, index) =>
          manager.create(WorkflowStepEntity, {
            ...step,
            workflowId: saved.id,
            order: step.order ?? index,
          }),
        );
        await manager.save(steps);
      }

      this.logger.info({ workflowId: saved.id, tenantId }, 'Workflow created');
      return this.findOne(saved.id, tenantId);
    });
  }

  async update(
    id: string,
    dto: UpdateWorkflowDto,
    userId: string,
    tenantId: string,
  ): Promise<WorkflowEntity> {
    const workflow = await this.findOne(id, tenantId);
    Object.assign(workflow, dto);
    await this.workflowRepo.save(workflow);
    return this.findOne(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const workflow = await this.findOne(id, tenantId);
    await this.workflowRepo.remove(workflow);
    this.logger.info({ workflowId: id, tenantId }, 'Workflow deleted');
  }

  async activate(id: string, tenantId: string): Promise<WorkflowEntity> {
    const workflow = await this.findOne(id, tenantId);
    workflow.status = WorkflowStatus.ACTIVE;
    return this.workflowRepo.save(workflow);
  }

  async trigger(id: string, tenantId: string, payload: Record<string, unknown>) {
    const workflow = await this.findOne(id, tenantId);

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new ForbiddenException('Workflow must be active to trigger');
    }

    return this.runService.execute(workflow, payload);
  }
}
