import type { ServiceaccounttypesServiceAccountDTO } from 'api/generated/services/sigNoz.schemas';
import {
	reflectedValues,
	spliceClause,
	valuesClause,
} from 'components/ListFilter/dsl/filterQuery';
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

// The statuses the filter shows for a query: its one top-level `status = x` or
// `status IN [...]` term, else none. Other operators are left to the box.
export function statusesOfQuery(query: string): string[] {
	return reflectedValues(query, 'status');
}

export function withStatuses(query: string, statuses: string[]): string {
	return spliceClause(query, 'status', valuesClause('status', statuses));
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
