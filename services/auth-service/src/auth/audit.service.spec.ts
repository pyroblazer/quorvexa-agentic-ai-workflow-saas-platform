import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AuditService } from './audit.service';
import { AuditLogEntity, AuditAction } from './entities/audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;
  let auditRepo: jest.Mocked<any>;

  beforeEach(async () => {
    auditRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLogEntity), useValue: auditRepo },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('saves an audit log with all provided fields', async () => {
    await service.log({
      userId: 'user-1',
      action: AuditAction.LOGIN,
      ipAddress: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
      success: true,
    });

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: AuditAction.LOGIN,
        ipAddress: '1.2.3.4',
        success: true,
      }),
    );
    expect(auditRepo.save).toHaveBeenCalled();
  });

  it('uses defaults for optional fields', async () => {
    await service.log({ action: AuditAction.REGISTER });

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        ipAddress: null,
        userAgent: null,
        success: true,
        errorMessage: null,
        metadata: null,
      }),
    );
  });

  it('records failure with error message', async () => {
    await service.log({
      action: AuditAction.LOGIN,
      success: false,
      errorMessage: 'Invalid credentials',
    });

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, errorMessage: 'Invalid credentials' }),
    );
  });

  it('records metadata when provided', async () => {
    const metadata = { reason: 'suspicious activity' };
    await service.log({
      action: AuditAction.ACCOUNT_LOCKED,
      metadata,
    });

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ metadata }),
    );
  });
});
