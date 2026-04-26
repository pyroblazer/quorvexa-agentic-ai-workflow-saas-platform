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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/request.types';

import { CreateNotificationDto, UpdateNotificationDto, ListNotificationsDto } from './dto/notification.dto';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notifService: NotificationService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a notification' })
  @ApiResponse({ status: 201, description: 'Notification created and queued for delivery' })
  send(@Body() dto: CreateNotificationDto, @Request() req: AuthenticatedRequest) {
    return this.notifService.create(dto, req.user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List notifications for the current tenant' })
  findAll(@Request() req: AuthenticatedRequest, @Query() query: ListNotificationsDto) {
    return this.notifService.findAll(req.user.tenantId, query);
  }

  @Get('me')
  @ApiOperation({ summary: 'List notifications for the current user' })
  findMine(@Request() req: AuthenticatedRequest, @Query() query: ListNotificationsDto) {
    return this.notifService.findByUser(req.user.id as string, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.notifService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update notification' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.notifService.update(id, req.user.tenantId, dto);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.notifService.markAsRead(id, req.user.tenantId);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a failed notification' })
  retry(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.notifService.retry(id, req.user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification' })
  delete(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
    return this.notifService.delete(id, req.user.tenantId);
  }
}
