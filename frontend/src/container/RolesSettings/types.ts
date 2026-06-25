import type { AuthZResource, AuthZVerb } from 'hooks/useAuthZ/types';
import { CoretypesTypeDTO } from 'api/generated/services/sigNoz.schemas';

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
	resourceType: CoretypesTypeDTO;
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

export interface ResourceItemsResult {
	items: SelectableItem[];
	isLoading: boolean;
}
