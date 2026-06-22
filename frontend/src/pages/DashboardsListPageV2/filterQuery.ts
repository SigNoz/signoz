// Pure, side-effect-free helpers that translate the UI filter state into the
// backend list-filter DSL string (`GET /api/v2/dashboards?query=…`). Kept
// testable and free of React so the same builder backs live filtering, saved
// views, and built-in views.
//
// DSL reference (subset used here):
//   name CONTAINS 'text'
//   created_by = 'a@b.com'  |  created_by IN ['a@b.com', 'c@d.com']
//   updated_at >= '2026-06-01T00:00:00.000Z'   (RFC3339)
//   locked = true
//   clauses joined with AND
import dayjs from 'dayjs';

import type { DashboardFilterState, UpdatedWindow } from './types';

export const DEFAULT_FILTER_STATE: DashboardFilterState = {
	search: '',
	createdBy: [],
	updated: 'any',
};

const UPDATED_WINDOW_DAYS: Record<Exclude<UpdatedWindow, 'any'>, number> = {
	today: 1,
	'7d': 7,
	'30d': 30,
};

// Single-quoted DSL string literal with embedded quotes escaped.
const literal = (value: string): string => `'${value.replace(/'/g, "\\'")}'`;

const updatedClause = (window: UpdatedWindow): string | null => {
	if (window === 'any') {
		return null;
	}
	const cutoff = dayjs()
		.subtract(UPDATED_WINDOW_DAYS[window], 'day')
		.toISOString();
	return `updated_at >= ${literal(cutoff)}`;
};

export const filterStateToQuery = (state: DashboardFilterState): string => {
	const clauses: string[] = [];

	const search = state.search.trim();
	if (search) {
		clauses.push(`name CONTAINS ${literal(search)}`);
	}

	if (state.createdBy.length === 1) {
		clauses.push(`created_by = ${literal(state.createdBy[0])}`);
	} else if (state.createdBy.length > 1) {
		clauses.push(`created_by IN [${state.createdBy.map(literal).join(', ')}]`);
	}

	const updated = updatedClause(state.updated);
	if (updated) {
		clauses.push(updated);
	}

	return clauses.join(' AND ');
};

// Combine independent query fragments (e.g. a built-in view's `locked = true`
// plus the live filter state) into a single AND-composed query.
export const combineQueries = (
	...parts: (string | null | undefined)[]
): string =>
	parts
		.map((p) => p?.trim())
		.filter((p): p is string => !!p)
		.join(' AND ');

export const isFilterStateEmpty = (state: DashboardFilterState): boolean =>
	!state.search.trim() &&
	state.createdBy.length === 0 &&
	state.updated === 'any';

export const areFilterStatesEqual = (
	a: DashboardFilterState,
	b: DashboardFilterState,
): boolean =>
	a.search.trim() === b.search.trim() &&
	a.updated === b.updated &&
	a.createdBy.length === b.createdBy.length &&
	[...a.createdBy].sort().join(',') === [...b.createdBy].sort().join(',');
