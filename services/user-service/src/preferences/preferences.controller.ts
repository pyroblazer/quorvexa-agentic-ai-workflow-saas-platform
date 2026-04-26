import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/request.types';

import { UpdatePreferencesDto } from './dto/preferences.dto';
import { PreferencesService } from './preferences.service';

@ApiTags('user-preferences')
@Controller('users/me/preferences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PreferencesController {
  constructor(private readonly prefsService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user preferences' })
  findMe(@Request() req: AuthenticatedRequest) {
    return this.prefsService.findOrCreate(req.user.id as string, req.user.tenantId as string);
  }

  @Patch()
  @ApiOperation({ summary: 'Update current user preferences' })
  update(@Body() dto: UpdatePreferencesDto, @Request() req: AuthenticatedRequest) {
    return this.prefsService.update(req.user.id as string, req.user.tenantId as string, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Reset preferences to defaults' })
  reset(@Request() req: AuthenticatedRequest) {
    return this.prefsService.reset(req.user.id as string);
  }
}
