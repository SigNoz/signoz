export type ADMIN = 'ADMIN';
export type VIEWER = 'VIEWER';
export type EDITOR = 'EDITOR';
export type AUTHOR = 'AUTHOR';
export type ANONYMOUS = 'ANONYMOUS';

export type ROLES = ADMIN | VIEWER | EDITOR | AUTHOR | ANONYMOUS;

export const USER_ROLES = {
	ADMIN: 'ADMIN',
	VIEWER: 'VIEWER',
	EDITOR: 'EDITOR',
	AUTHOR: 'AUTHOR',
	ANONYMOUS: 'ANONYMOUS',
};

export enum RoleType {
	MANAGED = 'managed',
	CUSTOM = 'custom',
}
