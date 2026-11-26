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

export interface DashboardViewCtx {
	userEmail: string;
	recent: string[];
}
