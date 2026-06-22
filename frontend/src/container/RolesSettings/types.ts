import type { AuthZResource, AuthZVerb } from 'hooks/useAuthZ/types';

export enum PermissionScope {
	ALL = 'all',
	ONLY_SELECTED = 'only_selected',
	NONE = 'none',
}

export type ActionScope = PermissionScope;

export interface ActionConfig {
	scope: ActionScope;
	selectedIds: string[];
}

export interface ResourcePermissions {
	resourceId: AuthZResource;
	resourceKind: AuthZResource;
	/** Resource type for API (e.g. 'metaresource', 'role', 'serviceaccount'). */
	resourceType: string;
	resourceLabel: string;
	actions: Partial<Record<AuthZVerb, ActionConfig>>;
	availableActions: AuthZVerb[];
}

export interface RolePermissionsData {
	roleId: string;
	roleName: string;
	roleDescription: string;
	resources: ResourcePermissions[];
}

export interface SelectableItem {
	id: string;
	label: string;
}

export const ACTION_LABELS: Record<string, string> = {
	read: 'Read',
	create: 'Create',
	update: 'Edit',
	delete: 'Delete',
	attach: 'Attach',
	detach: 'Detach',
	list: 'List',
	assignee: 'Assign',
};

export interface ResourceItemsResult {
	items: SelectableItem[];
	isLoading: boolean;
}
