import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { WorkflowStepEntity } from './entities/workflow-step.entity';
import { WorkflowEntity } from './entities/workflow.entity';
import { WorkflowRunService } from './workflow-run.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowEntity, WorkflowStepEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowRunService, JwtAuthGuard],
})
export class WorkflowModule {}
