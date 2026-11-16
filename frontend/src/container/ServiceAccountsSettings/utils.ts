import type { ServiceaccounttypesServiceAccountDTO } from 'api/generated/services/sigNoz.schemas';
import { spliceClause } from 'components/ListFilter/dsl/filterQuery';
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

// What the user typed besides the status the chip owns.
export function freeTextOfQuery(query: string): string {
	return spliceClause(query, 'status', null);
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
