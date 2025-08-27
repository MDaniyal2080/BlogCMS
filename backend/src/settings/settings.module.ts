import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, RolesGuard],
})
export class SettingsModule {}
