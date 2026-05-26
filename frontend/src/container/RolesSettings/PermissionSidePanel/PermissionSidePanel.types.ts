export interface ResourceOption {
	value: string;
	label: string;
}

export interface ResourceDefinition {
	id: string;
	kind: string;
	type: string;
	label: string;
	options?: ResourceOption[];
}

export enum PermissionScope {
	ALL = 'all',
	ONLY_SELECTED = 'only_selected',
	NONE = 'none',
}

export type ScopeType = PermissionScope;

export interface ResourceConfig {
	scope: ScopeType;
	selectedIds: string[];
}

export type PermissionConfig = Record<string, ResourceConfig>;

export interface PermissionSidePanelProps {
	open: boolean;
	onClose: () => void;
	permissionLabel: string;
	relation: string;
	resources: ResourceDefinition[];
	initialConfig?: PermissionConfig;
	isLoading?: boolean;
	isSaving?: boolean;
	canEdit?: boolean;
	onSave: (config: PermissionConfig) => void;
}
