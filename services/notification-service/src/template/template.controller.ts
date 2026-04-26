import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/request.types';

import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { TemplateService } from './template.service';

@ApiTags('notification-templates')
@Controller('notifications/templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  @ApiOperation({ summary: 'List notification templates' })
  findAll(@Request() req: AuthenticatedRequest, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.templateService.findAll(req.user.tenantId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.templateService.findOne(id, req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create notification template' })
  create(@Body() dto: CreateTemplateDto, @Request() req: AuthenticatedRequest) {
    return this.templateService.create(dto, req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update template' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.templateService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete template' })
  delete(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.templateService.delete(id, req.user.tenantId);
  }

  @Post(':id/render')
  @ApiOperation({ summary: 'Render template with variables' })
  render(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() variables: Record<string, unknown>,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.templateService.render(id, req.user.tenantId, variables);
  }
}
