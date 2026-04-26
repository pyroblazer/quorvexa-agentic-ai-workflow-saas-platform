import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLogEntity, AuditAction } from './entities/audit-log.entity';

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
  }
}
