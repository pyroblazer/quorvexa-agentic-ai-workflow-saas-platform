import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createLogger } from '@quorvexa/observability';
import * as nodemailer from 'nodemailer';
import { Repository } from 'typeorm';

import { CreateNotificationDto, UpdateNotificationDto, ListNotificationsDto } from './dto/notification.dto';
import { NotificationEntity, NotificationChannel, NotificationStatus } from './entities/notification.entity';

@Injectable()
export class NotificationService {
  private readonly logger = createLogger('notification-service:notifications');
  private readonly transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifRepo: Repository<NotificationEntity>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: process.env['SMTP_HOST'] ?? 'smtp.ethereal.email',
      port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
      secure: false,
      auth: {
        user: process.env['SMTP_USER'],
        pass: process.env['SMTP_PASS'],
      },
    });
  }

  async create(dto: CreateNotificationDto, tenantId: string): Promise<NotificationEntity> {
    const notification = this.notifRepo.create({ ...dto, tenantId });
    const saved = await this.notifRepo.save(notification);

    // Attempt delivery asynchronously
    this.deliver(saved).catch((err) => {
      this.logger.error({ notificationId: saved.id, err }, 'Async delivery failed');
    });

    return saved;
  }

  async findAll(tenantId: string, query: ListNotificationsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const qb = this.notifRepo.createQueryBuilder('n')
      .where('n.tenantId = :tenantId', { tenantId })
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('n.status = :status', { status: query.status });
    if (query.channel) qb.andWhere('n.channel = :channel', { channel: query.channel });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<NotificationEntity> {
    const notification = await this.notifRepo.findOne({ where: { id, tenantId } });
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return notification;
  }

  async update(id: string, tenantId: string, dto: UpdateNotificationDto): Promise<NotificationEntity> {
    const notification = await this.findOne(id, tenantId);
    Object.assign(notification, dto);
    return this.notifRepo.save(notification);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const notification = await this.findOne(id, tenantId);
    await this.notifRepo.remove(notification);
    this.logger.info({ notificationId: id }, 'Notification deleted');
  }

  async markAsRead(id: string, tenantId: string): Promise<NotificationEntity> {
    const notification = await this.findOne(id, tenantId);
    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();
    return this.notifRepo.save(notification);
  }

  async retry(id: string, tenantId: string): Promise<NotificationEntity> {
    const notification = await this.findOne(id, tenantId);
    if (notification.retryCount >= notification.maxRetries) {
      throw new NotFoundException('Max retries exceeded');
    }
    notification.retryCount += 1;
    notification.status = NotificationStatus.PENDING;
    await this.notifRepo.save(notification);

    await this.deliver(notification);
    return notification;
  }

  async findByUser(userId: string, query: ListNotificationsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const qb = this.notifRepo.createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('n.status = :status', { status: query.status });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  private async deliver(notification: NotificationEntity): Promise<void> {
    try {
      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          await this.sendEmail(notification);
          break;
        case NotificationChannel.WEBHOOK:
          await this.sendWebhook(notification);
          break;
        case NotificationChannel.IN_APP:
          await this.storeInApp(notification);
          break;
        case NotificationChannel.SMS:
          await this.sendSms(notification);
          break;
        case NotificationChannel.SLACK:
          await this.sendSlack(notification);
          break;
      }

      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      await this.notifRepo.save(notification);
    } catch (err) {
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = (err as Error).message;
      await this.notifRepo.save(notification);
      this.logger.error({ notificationId: notification.id, err }, 'Delivery failed');
    }
  }

  private async sendEmail(notification: NotificationEntity): Promise<void> {
    await this.transporter.sendMail({
      from: process.env['EMAIL_FROM'] ?? 'noreply@quorvexa.dev',
      to: notification.recipient,
      subject: notification.subject,
      text: notification.body,
    });
  }

  private async sendWebhook(notification: NotificationEntity): Promise<void> {
    const response = await fetch(notification.recipient, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Quorvexa/1.0' },
      body: JSON.stringify({
        subject: notification.subject,
        body: notification.body,
        metadata: notification.metadata,
      }),
    });
    if (!response.ok) throw new Error(`Webhook failed: ${response.status}`);
  }

  private async storeInApp(notification: NotificationEntity): Promise<void> {
    this.logger.info({ recipient: notification.recipient, notificationId: notification.id }, 'In-app notification stored');
  }

  private async sendSms(notification: NotificationEntity): Promise<void> {
    this.logger.info({ to: notification.recipient, notificationId: notification.id }, 'SMS notification sent (stub)');
  }

  private async sendSlack(notification: NotificationEntity): Promise<void> {
    const webhookUrl = process.env['SLACK_WEBHOOK_URL'];
    if (!webhookUrl) throw new Error('Slack webhook URL not configured');
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `*${notification.subject}*\n${notification.body}` }),
    });
  }
}
