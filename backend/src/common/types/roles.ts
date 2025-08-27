export enum AppRoleEnum {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
}

// String union compatible with Prisma $Enums.Role
export type AppRole = 'ADMIN' | 'EDITOR';
