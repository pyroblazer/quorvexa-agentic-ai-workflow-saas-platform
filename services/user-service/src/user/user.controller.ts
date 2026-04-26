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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/types/request.types';

import { UpdateProfileDto, CreateProfileDto, ListUsersQueryDto } from './dto/update-profile.dto';
import { UserService } from './user.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'List all user profiles for the current tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.userService.findAll(req.user.tenantId, query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  findMe(@Request() req: AuthenticatedRequest) {
    return this.userService.findByUserId(req.user.id as string);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user profile by ID' })
  findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.userService.findOne(id, req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a user profile' })
  @ApiResponse({ status: 201, description: 'Profile created' })
  create(@Body() dto: CreateProfileDto, @Request() req: AuthenticatedRequest) {
    return this.userService.create({ ...dto, tenantId: dto.tenantId ?? req.user.tenantId });
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@Body() dto: UpdateProfileDto, @Request() req: AuthenticatedRequest) {
    return this.userService.updateByUserId(req.user.id as string, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile by ID' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.userService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user profile' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.userService.delete(id, req.user.tenantId);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend user account' })
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.userService.suspend(id, req.user.tenantId);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate user account' })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.userService.activate(id, req.user.tenantId);
  }
}
