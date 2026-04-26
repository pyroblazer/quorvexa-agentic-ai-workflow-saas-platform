import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationTemplateEntity } from './entities/notification-template.entity';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationTemplateEntity])],
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
