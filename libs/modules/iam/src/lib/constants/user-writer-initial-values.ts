import { applyInitialValues } from '@vt/common-utils';

import { UserRole, UserStatus } from '../schemas/user.schema';

export type UserInitialValuesInput = {
  fullName: string;
  email: string;
  hashedPassword?: string;
  role?: UserRole;
  status?: UserStatus;
  isDeleted?: boolean;
};

export type UserInitialValues = UserInitialValuesInput & {
  role: UserRole;
  status: UserStatus;
  isDeleted: boolean;
};

export const USER_INITIAL_VALUES = Object.freeze({
  role: UserRole.EDITOR,
  status: UserStatus.ACTIVE,
  isDeleted: false,
} satisfies Pick<UserInitialValues, 'role' | 'status' | 'isDeleted'>);

export function buildInitialUserValues(input: UserInitialValuesInput): UserInitialValues {
  return applyInitialValues<
    UserInitialValuesInput,
    Pick<UserInitialValues, 'role' | 'status' | 'isDeleted'>
  >(input, USER_INITIAL_VALUES) as UserInitialValues;
}
