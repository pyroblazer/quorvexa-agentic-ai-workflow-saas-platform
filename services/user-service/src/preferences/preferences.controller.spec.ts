import 'reflect-metadata';
jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common') as Record<string, unknown>;
  return { ...actual, Version: () => () => {} };
});
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { PreferencesController } from './preferences.controller';
import { PreferencesService } from './preferences.service';

function makePrefs(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pref-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    theme: 'system',
    locale: 'en-US',
    timezone: 'UTC',
    emailNotifications: true,
    twoFactorEnabled: false,
    ...overrides,
  };
}

function makeRequest() {
  return { user: { sub: 'user-1', id: 'user-1', tenantId: 'tenant-1' } } as any;
}

describe('PreferencesController', () => {
  let controller: PreferencesController;
  let prefsService: jest.Mocked<PreferencesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PreferencesController],
      providers: [
        {
          provide: PreferencesService,
          useValue: {
            findOrCreate: jest.fn(),
            update: jest.fn(),
            reset: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PreferencesController>(PreferencesController);
    prefsService = module.get(PreferencesService);
  });

  describe('findMe', () => {
    it('returns preferences for current user, creating defaults if missing', async () => {
      const prefs = makePrefs();
      prefsService.findOrCreate.mockResolvedValue(prefs as any);
      const result = await controller.findMe(makeRequest());
      expect(prefsService.findOrCreate).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toBe(prefs);
    });
  });

  describe('update', () => {
    it('updates preferences with provided DTO', async () => {
      const updated = makePrefs({ theme: 'dark' });
      prefsService.update.mockResolvedValue(updated as any);
      const result = await controller.update({ theme: 'dark' } as any, makeRequest());
      expect(prefsService.update).toHaveBeenCalledWith('user-1', 'tenant-1', { theme: 'dark' });
      expect(result).toBe(updated);
    });
  });

  describe('reset', () => {
    it('resets preferences to defaults', async () => {
      const defaultPrefs = makePrefs();
      prefsService.reset.mockResolvedValue(defaultPrefs as any);
      const result = await controller.reset(makeRequest());
      expect(prefsService.reset).toHaveBeenCalledWith('user-1');
      expect(result).toBe(defaultPrefs);
    });
  });
});
