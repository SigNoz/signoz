import type {
	DashboardtypesListOrderDTO,
	DashboardtypesListSortDTO,
} from 'api/generated/services/sigNoz.schemas';

// The filter a saved view captures. The backend stores a flat `{ query, sort, order }`
// (no structured chips), so a view captures the fully-combined DSL query plus the
// sort/order to apply.
export interface DashboardViewFilter {
	query: string;
	sort: DashboardtypesListSortDTO;
	order: DashboardtypesListOrderDTO;
}

// Built-in views rendered above the user's saved views. Their result set is
// derived (a fixed query fragment or a client-side id set), never persisted.
// String values double as the URL `view` param, so they must stay stable.
export enum BuiltinViewId {
	Mine = 'mine',
	Pinned = 'pinned',
	Recent = 'recent',
	All = 'all',
	Locked = 'locked',
}
