import type { ServiceaccounttypesServiceAccountDTO } from 'api/generated/services/sigNoz.schemas';
import { toISOString } from 'utils/app';

export function toServiceAccountRow(
	sa: ServiceaccounttypesServiceAccountDTO,
): ServiceAccountRow {
	return {
		id: sa.id,
		name: sa.name,
		email: sa.email,
		status: sa.status,
		createdAt: toISOString(sa.createdAt),
		updatedAt: toISOString(sa.updatedAt),
	};
}

export enum FilterMode {
	All = 'all',
	Active = 'active',
	Deleted = 'deleted',
}

export enum ServiceAccountStatus {
	Active = 'ACTIVE',
	Deleted = 'DELETED',
}

export interface ServiceAccountRow {
	id: string;
	name: string;
	email: string;
	status: string;
	createdAt: string | null;
	updatedAt: string | null;
}
