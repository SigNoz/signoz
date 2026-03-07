export enum FilterMode {
	All = 'all',
	Active = 'active',
	Disabled = 'disabled',
}

export interface ServiceAccountRow {
	id: string;
	name: string;
	email: string;
	roles: string[];
	status: string;
	createdAt: string | null;
	updatedAt: string | null;
}
