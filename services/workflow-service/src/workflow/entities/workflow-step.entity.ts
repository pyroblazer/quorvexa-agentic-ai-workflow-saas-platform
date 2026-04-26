import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { WorkflowEntity } from './workflow.entity';

export enum StepType {
  ACTION = 'action',
  CONDITION = 'condition',
  AI_AGENT = 'ai_agent',
  HTTP_REQUEST = 'http_request',
  NOTIFICATION = 'notification',
  DELAY = 'delay',
  TRANSFORM = 'transform',
}

export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Entity('workflow_steps')
export class WorkflowStepEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  workflowId: string;

  @ManyToOne(() => WorkflowEntity, (w) => w.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflowId' })
  workflow: WorkflowEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: StepType })
  type: StepType;

  // Execution order within the workflow
  @Column({ type: 'int' })
  order: number;

  // Step-specific configuration (e.g., prompt for AI_AGENT, URL for HTTP_REQUEST)
  @Column({ type: 'jsonb', default: {} })
  config: Record<string, unknown>;

  // Output from last run — stored for debugging and chaining
  @Column({ type: 'jsonb', nullable: true })
  lastOutput: Record<string, unknown> | null;

  @Column({ type: 'enum', enum: StepStatus, default: StepStatus.PENDING })
  lastStatus: StepStatus;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'int', default: 0 })
  retryDelayMs: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
