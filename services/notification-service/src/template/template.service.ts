import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createLogger } from '@quorvexa/observability';
import { Repository } from 'typeorm';

import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { NotificationTemplateEntity } from './entities/notification-template.entity';

@Injectable()
export class TemplateService {
  private readonly logger = createLogger('notification-service:templates');

  constructor(
    @InjectRepository(NotificationTemplateEntity)
    private readonly templateRepo: Repository<NotificationTemplateEntity>,
  ) {}

  async create(dto: CreateTemplateDto, tenantId: string): Promise<NotificationTemplateEntity> {
    const existing = await this.templateRepo.findOne({ where: { slug: dto.slug, tenantId } });
    if (existing) {
      throw new ConflictException(`Template with slug "${dto.slug}" already exists`);
    }

    const template = this.templateRepo.create({ ...dto, tenantId });
    const saved = await this.templateRepo.save(template);
    this.logger.info({ templateId: saved.id, tenantId }, 'Template created');
    return saved;
  }

  async findAll(tenantId: string, page = 1, limit = 20) {
    const [items, total] = await this.templateRepo.findAndCount({
      where: { tenantId },
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: Math.min(limit, 100),
    });
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<NotificationTemplateEntity> {
    const template = await this.templateRepo.findOne({ where: { id, tenantId } });
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    return template;
  }

  async findBySlug(slug: string, tenantId: string): Promise<NotificationTemplateEntity> {
    const template = await this.templateRepo.findOne({ where: { slug, tenantId } });
    if (!template) {
      throw new NotFoundException(`Template with slug "${slug}" not found`);
    }
    return template;
  }

  async update(id: string, tenantId: string, dto: UpdateTemplateDto): Promise<NotificationTemplateEntity> {
    const template = await this.findOne(id, tenantId);
    Object.assign(template, dto);
    const saved = await this.templateRepo.save(template);
    this.logger.info({ templateId: id, tenantId }, 'Template updated');
    return saved;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const template = await this.findOne(id, tenantId);
    await this.templateRepo.remove(template);
    this.logger.info({ templateId: id, tenantId }, 'Template deleted');
  }

  async render(slug: string, tenantId: string, variables: Record<string, unknown>): Promise<{ subject: string; body: string }> {
    const template = await this.findBySlug(slug, tenantId);
    const merged = { ...template.defaultValues, ...variables };

    let subject = template.subject;
    let body = template.bodyTemplate;

    for (const [key, value] of Object.entries(merged)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replaceAll(placeholder, String(value));
      body = body.replaceAll(placeholder, String(value));
    }

    return { subject, body };
  }
}
