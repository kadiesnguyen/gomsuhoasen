export const USER_ROLES = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const USER_ROLE_VALUES = Object.values(USER_ROLES) as UserRole[];

export const USER_ROLE_GROUPS = {
  ADMIN_ONLY: [USER_ROLES.ADMIN],
  ADMIN_EDITOR: [USER_ROLES.ADMIN, USER_ROLES.EDITOR],
} as const;

export const USER_STATUSES = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
} as const;

export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES];

export const USER_STATUS_VALUES = Object.values(USER_STATUSES) as UserStatus[];

export interface UserContract {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
}
