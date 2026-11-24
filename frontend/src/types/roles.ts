type ADMIN = 'ADMIN';
type VIEWER = 'VIEWER';
type EDITOR = 'EDITOR';
type AUTHOR = 'AUTHOR';
type ANONYMOUS = 'ANONYMOUS';

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
