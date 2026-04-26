import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createLogger } from '@quorvexa/observability';
import { Repository } from 'typeorm';

import { UpdatePreferencesDto } from './dto/preferences.dto';
import { UserPreferencesEntity } from './entities/user-preferences.entity';

@Injectable()
export class PreferencesService {
  private readonly logger = createLogger('user-service:preferences');

  constructor(
    @InjectRepository(UserPreferencesEntity)
    private readonly prefsRepo: Repository<UserPreferencesEntity>,
  ) {}

  async findOrCreate(userId: string, tenantId: string): Promise<UserPreferencesEntity> {
    let prefs = await this.prefsRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.prefsRepo.create({ userId, tenantId });
      prefs = await this.prefsRepo.save(prefs);
      this.logger.info({ userId }, 'Default preferences created');
    }
    return prefs;
  }

  async update(userId: string, tenantId: string, dto: UpdatePreferencesDto): Promise<UserPreferencesEntity> {
    const prefs = await this.findOrCreate(userId, tenantId);
    Object.assign(prefs, dto);
    const saved = await this.prefsRepo.save(prefs);
    this.logger.info({ userId }, 'User preferences updated');
    return saved;
  }

  async reset(userId: string): Promise<UserPreferencesEntity> {
    const prefs = await this.prefsRepo.findOne({ where: { userId } });
    if (!prefs) {
      throw new NotFoundException(`Preferences for user ${userId} not found`);
    }
    prefs.theme = 'system' as any;
    prefs.locale = 'en-US';
    prefs.dateFormat = 'YYYY-MM-DD' as any;
    prefs.timezone = 'UTC';
    prefs.notificationSettings = {};
    prefs.dashboardLayout = {};
    prefs.emailNotifications = true;
    prefs.twoFactorEnabled = false;
    return this.prefsRepo.save(prefs);
  }
}
