import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UserPreferencesEntity, Theme, DateFormat } from './entities/user-preferences.entity';
import { PreferencesService } from './preferences.service';

function makePrefs(overrides: Partial<UserPreferencesEntity> = {}): UserPreferencesEntity {
  const p = new UserPreferencesEntity();
  p.id = 'prefs-1';
  p.userId = 'user-1';
  p.theme = Theme.SYSTEM;
  p.locale = 'en-US';
  p.dateFormat = DateFormat.YYYY_MM_DD;
  p.timezone = 'UTC';
  p.notificationSettings = {};
  p.dashboardLayout = {};
  p.emailNotifications = true;
  p.twoFactorEnabled = false;
  p.tenantId = 'tenant-1';
  p.createdAt = new Date();
  p.updatedAt = new Date();
  return Object.assign(p, overrides);
}

describe('PreferencesService', () => {
  let service: PreferencesService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((data) => Object.assign(new UserPreferencesEntity(), data)),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        { provide: getRepositoryToken(UserPreferencesEntity), useValue: repo },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
  });

  describe('findOrCreate', () => {
    it('returns existing preferences', async () => {
      repo.findOne.mockResolvedValue(makePrefs());

      const result = await service.findOrCreate('user-1', 'tenant-1');

      expect(result.userId).toBe('user-1');
    });

    it('creates default preferences when none exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const _result = await service.findOrCreate('user-1', 'tenant-1');

      expect(repo.create).toHaveBeenCalledWith({ userId: 'user-1', tenantId: 'tenant-1' });
    });
  });

  describe('update', () => {
    it('updates preference fields', async () => {
      repo.findOne.mockResolvedValue(makePrefs());

      const _result = await service.update('user-1', 'tenant-1', { theme: Theme.DARK });

      expect(repo.save).toHaveBeenCalled();
    });

    it('creates preferences if they do not exist', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      await service.update('user-1', 'tenant-1', { theme: Theme.DARK });

      expect(repo.create).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('resets all preferences to defaults', async () => {
      const prefs = makePrefs({ theme: Theme.DARK, locale: 'fr-FR', twoFactorEnabled: true });
      repo.findOne.mockResolvedValue(prefs);
      repo.save.mockImplementation(async (p: any) => p);

      const result = await service.reset('user-1');

      expect(result.theme).toBe(Theme.SYSTEM as any);
      expect(result.locale).toBe('en-US');
      expect(result.twoFactorEnabled).toBe(false);
    });

    it('throws NotFoundException when preferences do not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.reset('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
