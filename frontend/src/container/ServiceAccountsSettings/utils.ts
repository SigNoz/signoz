export enum FilterMode {
	All = 'all',
	Active = 'active',
	Disabled = 'disabled',
}

export enum ServiceAccountStatus {
	Active = 'ACTIVE',
	Disabled = 'DISABLED',
}

export interface ServiceAccountRow {
	id: string;
	name: string;
	email: string;
	roles: string[];
	status: ServiceAccountStatus | string;
	createdAt: string | null;
	updatedAt: string | null;
}
