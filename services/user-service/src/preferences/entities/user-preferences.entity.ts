import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export enum DateFormat {
  MM_DD_YYYY = 'MM/DD/YYYY',
  DD_MM_YYYY = 'DD/MM/YYYY',
  YYYY_MM_DD = 'YYYY-MM-DD',
}

@Entity('user_preferences')
export class UserPreferencesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: Theme, default: Theme.SYSTEM })
  theme: Theme;

  @Column({ type: 'varchar', length: 10, default: 'en-US' })
  locale: string;

  @Column({ type: 'enum', enum: DateFormat, default: DateFormat.YYYY_MM_DD })
  dateFormat: DateFormat;

  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  @Column({ type: 'jsonb', default: {} })
  notificationSettings: Record<string, boolean>;

  @Column({ type: 'jsonb', default: {} })
  dashboardLayout: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
