import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRoleEnum } from '../common/types/roles';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'List all settings' })
  findAll() {
    return this.settingsService.findAll();
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update a setting by key' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN)
  update(@Param('key') key: string, @Body() body: UpdateSettingDto) {
    return this.settingsService.update(key, body);
  }
}
