import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsObject,
} from 'class-validator';

import { StepType } from '../entities/workflow-step.entity';
import { TriggerType } from '../entities/workflow.entity';

class CreateWorkflowStepDto {
  @ApiProperty() @IsString() @MaxLength(255) name: string;
  @ApiProperty({ enum: StepType }) @IsEnum(StepType) type: StepType;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) order?: number;
  @ApiProperty({ type: Object }) @IsObject() config: Record<string, unknown>;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) maxRetries?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(0) retryDelayMs?: number;
}

export class CreateWorkflowDto {
  @ApiProperty({ example: 'Customer Onboarding' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TriggerType, required: false })
  @IsOptional()
  @IsEnum(TriggerType)
  triggerType?: TriggerType;

  @ApiProperty({ required: false, example: '0 9 * * 1' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiProperty({ type: [CreateWorkflowStepDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowStepDto)
  steps?: CreateWorkflowStepDto[];

  @ApiProperty({ type: Object, required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
