import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserEntity, UserRole, UserStatus } from './entities/user.entity';

interface CreateUserParams {
  email: string;
  passwordHash: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  tenantId: string;
  oauthProvider?: string;
  oauthId?: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async create(params: CreateUserParams): Promise<UserEntity> {
    const user = this.userRepo.create(params);
    return this.userRepo.save(user);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  // Selects passwordHash which is excluded by default for security
  async findByEmailWithPassword(email: string): Promise<UserEntity | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepo.update(id, { lastLoginAt: new Date() });
  }

  async incrementFailedAttempts(id: string, attempts: number): Promise<void> {
    await this.userRepo.update(id, { failedLoginAttempts: attempts });
  }

  async resetFailedAttempts(id: string): Promise<void> {
    await this.userRepo.update(id, { failedLoginAttempts: 0, lockedUntil: null });
  }

  async lockAccount(id: string, lockedUntil: Date, attempts: number): Promise<void> {
    await this.userRepo.update(id, { lockedUntil, failedLoginAttempts: attempts });
  }

  async findOrCreateOAuthUser(params: {
    email: string;
    firstName: string;
    lastName: string;
    oauthProvider: string;
    oauthId: string;
    avatarUrl?: string;
    tenantId: string;
  }): Promise<UserEntity> {
    let user = await this.userRepo.findOne({
      where: { oauthProvider: params.oauthProvider, oauthId: params.oauthId },
    });

    if (!user) {
      user = this.userRepo.create({
        ...params,
        passwordHash: null,
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      });
      user = await this.userRepo.save(user);
    }

    return user;
  }
}
