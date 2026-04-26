import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsObject,
  IsBoolean,
} from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  slug: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  subject: string;

  @ApiProperty()
  @IsString()
  bodyTemplate: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  channel: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  defaultValues?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  defaultValues?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
