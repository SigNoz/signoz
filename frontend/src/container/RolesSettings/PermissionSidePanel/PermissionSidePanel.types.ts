export interface ResourceOption {
	value: string;
	label: string;
}

export interface ResourceDefinition {
	id: string;
	label: string;
	/** Options for the "Only selected" dropdown — to be populated via API */
	options?: ResourceOption[];
}

export type ScopeType = 'all' | 'only_selected';

export interface ResourceConfig {
	enabled: boolean;
	scope: ScopeType;
	selectedIds: string[];
}

/** keyed by ResourceDefinition.id */
export type PermissionConfig = Record<string, ResourceConfig>;

export interface PermissionSidePanelProps {
	open: boolean;
	onClose: () => void;
	/** e.g. "Read", "Create", "Delete" */
	permissionLabel: string;
	/** Ordered list of resources shown in the panel */
	resources: ResourceDefinition[];
	/** Pre-existing configuration to initialise from */
	initialConfig?: PermissionConfig;
	/** Called with the full resolved config when user saves */
	onSave: (config: PermissionConfig) => void;
}
