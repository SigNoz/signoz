import type { ServiceaccounttypesServiceAccountDTO } from 'api/generated/services/sigNoz.schemas';
import {
	reflectedEqualityValue,
	spliceClause,
} from 'components/ListFilter/dsl/filterQuery';
import { toISOString } from 'utils/app';

import { where } from './list.config';

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

// The mode the dropdown shows for a query: its one top-level `status = x` clause, else All.
export function filterModeFromQuery(query: string): FilterMode {
	const status = reflectedEqualityValue(query, 'status')?.toLowerCase();
	if (status === FilterMode.Active || status === FilterMode.Deleted) {
		return status;
	}
	return FilterMode.All;
}

export function withFilterMode(query: string, mode: FilterMode): string {
	return spliceClause(
		query,
		'status',
		mode === FilterMode.All ? null : where('status', '=', mode),
	);
}

// What the user typed besides the status the dropdown owns.
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
