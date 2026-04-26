import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createLogger } from '@quorvexa/observability';
import { Repository, FindOptionsWhere } from 'typeorm';

import { CreateProfileDto, UpdateProfileDto, ListUsersQueryDto } from './dto/update-profile.dto';
import { UserProfileEntity, UserProfileStatus } from './entities/user-profile.entity';

@Injectable()
export class UserService {
  private readonly logger = createLogger('user-service:users');

  constructor(
    @InjectRepository(UserProfileEntity)
    private readonly profileRepo: Repository<UserProfileEntity>,
  ) {}

  async create(dto: CreateProfileDto): Promise<UserProfileEntity> {
    const existing = await this.profileRepo.findOne({ where: { userId: dto.userId } });
    if (existing) {
      throw new ConflictException(`Profile already exists for user ${dto.userId}`);
    }

    const profile = this.profileRepo.create(dto);
    const saved = await this.profileRepo.save(profile);
    this.logger.info({ userId: dto.userId }, 'User profile created');
    return saved;
  }

  async findAll(tenantId: string, query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: FindOptionsWhere<UserProfileEntity> = { tenantId };

    if (query.status) where.status = query.status;
    if (query.department) where.department = query.department;

    const qb = this.profileRepo.createQueryBuilder('profile')
      .where('profile.tenantId = :tenantId', { tenantId })
      .orderBy('profile.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('profile.status = :status', { status: query.status });
    if (query.department) qb.andWhere('profile.department = :department', { department: query.department });
    if (query.search) {
      qb.andWhere('(profile.firstName ILIKE :search OR profile.lastName ILIKE :search OR profile.title ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<UserProfileEntity> {
    const profile = await this.profileRepo.findOne({ where: { id, tenantId } });
    if (!profile) {
      throw new NotFoundException(`User profile ${id} not found`);
    }
    return profile;
  }

  async findByUserId(userId: string): Promise<UserProfileEntity> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }
    return profile;
  }

  async update(id: string, tenantId: string, dto: UpdateProfileDto): Promise<UserProfileEntity> {
    const profile = await this.findOne(id, tenantId);
    Object.assign(profile, dto);
    const saved = await this.profileRepo.save(profile);
    this.logger.info({ profileId: id, tenantId }, 'User profile updated');
    return saved;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const profile = await this.findOne(id, tenantId);
    await this.profileRepo.remove(profile);
    this.logger.info({ profileId: id, tenantId }, 'User profile deleted');
  }

  async updateLastActive(userId: string): Promise<void> {
    await this.profileRepo.update({ userId }, { lastActiveAt: new Date() });
  }

  async updateByUserId(userId: string, dto: UpdateProfileDto): Promise<UserProfileEntity> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }
    Object.assign(profile, dto);
    return this.profileRepo.save(profile);
  }

  async suspend(id: string, tenantId: string): Promise<UserProfileEntity> {
    const profile = await this.findOne(id, tenantId);
    profile.status = UserProfileStatus.SUSPENDED;
    return this.profileRepo.save(profile);
  }

  async activate(id: string, tenantId: string): Promise<UserProfileEntity> {
    const profile = await this.findOne(id, tenantId);
    profile.status = UserProfileStatus.ACTIVE;
    return this.profileRepo.save(profile);
  }
}
