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
  ParseIntPipe,
  DefaultValuePipe,
  Sse,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Observable, interval, map } from 'rxjs';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/request.types';

import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowService } from './workflow.service';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  @ApiOperation({ summary: 'List all workflows for the current tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.workflowService.findAll(req.user.tenantId, page, Math.min(limit, 100));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  findOne(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.workflowService.findOne(id, req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created' })
  create(@Body() dto: CreateWorkflowDto, @Request() req: AuthenticatedRequest) {
    return this.workflowService.create(dto, req.user.sub, req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workflow' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.workflowService.update(id, dto, req.user.sub, req.user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workflow' })
  delete(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.workflowService.delete(id, req.user.tenantId);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a draft workflow' })
  activate(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.workflowService.activate(id, req.user.tenantId);
  }

  @Post(':id/trigger')
  @ApiOperation({ summary: 'Manually trigger a workflow run' })
  trigger(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: Record<string, unknown>,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.workflowService.trigger(id, req.user.tenantId, payload);
  }

  // SSE endpoint for real-time workflow execution events
  @Sse(':id/events')
  @ApiOperation({ summary: 'Subscribe to real-time workflow events via SSE' })
  events(@Param('id', ParseUUIDPipe) id: string): Observable<MessageEvent> {
    return interval(2000).pipe(
      map(() => ({
        data: JSON.stringify({ workflowId: id, timestamp: new Date().toISOString(), type: 'heartbeat' }),
      } as MessageEvent)),
    );
  }
}
