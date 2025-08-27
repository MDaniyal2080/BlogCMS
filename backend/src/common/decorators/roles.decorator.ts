import { SetMetadata } from '@nestjs/common';
import { AppRoleEnum } from '../types/roles';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRoleEnum[]) => SetMetadata(ROLES_KEY, roles);
