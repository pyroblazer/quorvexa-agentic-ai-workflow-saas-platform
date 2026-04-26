import 'reflect-metadata';
jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common') as Record<string, unknown>;
  return { ...actual, Version: () => () => {} };
});
import { HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<HealthCheckService>;
  let _memoryIndicator: jest.Mocked<MemoryHealthIndicator>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn().mockResolvedValue({ status: 'ok', details: {} }),
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get(HealthCheckService);
    _memoryIndicator = module.get(MemoryHealthIndicator);
  });

  describe('check', () => {
    it('calls health.check with memory heap indicator', async () => {
      const result = await controller.check();
      expect(healthService.check).toHaveBeenCalledWith([expect.any(Function)]);
      expect(result).toMatchObject({ status: 'ok' });
    });
  });

  describe('ready', () => {
    it('returns ok status with service name', () => {
      const result = controller.ready();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('gateway');
      expect(result.timestamp).toBeDefined();
    });

    it('returns valid ISO timestamp', () => {
      const result = controller.ready();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('live', () => {
    it('returns ok status with service name', () => {
      const result = controller.live();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('gateway');
    });

    it('returns a valid ISO timestamp', () => {
      const result = controller.live();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
