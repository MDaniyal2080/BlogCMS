import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRoleEnum } from '../common/types/roles';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  // ---------- Self-service profile endpoints (placed before :id routes to avoid collisions) ----------

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: any) {
    return this.usersService.getMe(user.userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: any, @Body() body: UpdateProfileDto) {
    return this.usersService.updateMe(user.userId, body);
  }

  @Put('me/password')
  @ApiOperation({ summary: 'Change current user password' })
  @UseGuards(JwtAuthGuard)
  changeMyPassword(
    @CurrentUser() user: any,
    @Body() body: ChangePasswordDto,
  ) {
    return this.usersService.changeMyPassword(user.userId, body);
  }

  @Get('me/notifications')
  @ApiOperation({ summary: 'Get current user notification preferences' })
  @UseGuards(JwtAuthGuard)
  getMyNotifications(@CurrentUser() user: any) {
    return this.usersService.getMyNotifications(user.userId);
  }

  @Put('me/notifications')
  @ApiOperation({ summary: 'Update current user notification preferences' })
  @UseGuards(JwtAuthGuard)
  updateMyNotifications(
    @CurrentUser() user: any,
    @Body() body: UpdateNotificationsDto,
  ) {
    return this.usersService.updateMyNotifications(user.userId, body);
  }

  @Get('me/activity')
  @ApiOperation({ summary: 'List recent activity for current user' })
  @UseGuards(JwtAuthGuard)
  getMyActivity(@CurrentUser() user: any) {
    return this.usersService.getMyActivity(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create user' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN)
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN)
  update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

}
