import { buildPermission } from '../utils';
import type { BrandedPermission } from '../types';

export const UserCreatePermission = buildPermission('create', 'user:*');
export const UserListPermission = buildPermission('list', 'user:*');

export const buildUserReadPermission = (id: string): BrandedPermission =>
	buildPermission('read', `user:${id}`);
export const buildUserUpdatePermission = (id: string): BrandedPermission =>
	buildPermission('update', `user:${id}`);
export const buildUserDeletePermission = (id: string): BrandedPermission =>
	buildPermission('delete', `user:${id}`);
export const buildUserAttachPermission = (id: string): BrandedPermission =>
	buildPermission('attach', `user:${id}`);
export const buildUserDetachPermission = (id: string): BrandedPermission =>
	buildPermission('detach', `user:${id}`);

const PasswordCreatePermission = buildPermission('create', 'factor-password:*');

export const buildResetPasswordPermission = (
	id: string,
): BrandedPermission[] => [
	PasswordCreatePermission,
	buildUserAttachPermission(id),
];
