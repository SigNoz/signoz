import { ROLES } from 'types/roles';

export type ComponentTypes = 'current_org_settings' | 'invite_members';

export const componentPermission: Record<ComponentTypes, ROLES[]> = {
	current_org_settings: ['ADMIN_GROUP'],
	invite_members: ['ADMIN_GROUP'],
};
