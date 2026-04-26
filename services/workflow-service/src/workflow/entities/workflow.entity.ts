import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

import { WorkflowStepEntity } from './workflow-step.entity';

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum TriggerType {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  WEBHOOK = 'webhook',
  EVENT = 'event',
}

@Entity('workflows')
export class WorkflowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: WorkflowStatus, default: WorkflowStatus.DRAFT })
  status: WorkflowStatus;

  @Column({ type: 'enum', enum: TriggerType, default: TriggerType.MANUAL })
  triggerType: TriggerType;

  // CRON expression for scheduled workflows
  @Column({ type: 'varchar', length: 100, nullable: true })
  cronExpression: string | null;

  // Webhook secret for validating incoming trigger payloads
  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  webhookSecret: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ type: 'int', default: 0 })
  runCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => WorkflowStepEntity, (step) => step.workflow, { cascade: true, eager: false })
  steps: WorkflowStepEntity[];
}
