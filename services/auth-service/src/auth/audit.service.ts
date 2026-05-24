import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createLogger } from '@quorvexa/observability';
import { Repository } from 'typeorm';

import { AuditLogEntity, AuditAction } from './entities/audit-log.entity';

const logger = createLogger('auth-service:audit');

interface AuditLogParams {
  userId?: string | null;
  action: AuditAction;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          userId: params.userId ?? null,
          action: params.action,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          success: params.success ?? true,
          errorMessage: params.errorMessage ?? null,
          metadata: params.metadata ?? null,
        }),
      );
    } catch (err) {
      logger.warn({ err, action: params.action }, 'Audit log write failed — non-critical, continuing');
    }
  }
}
