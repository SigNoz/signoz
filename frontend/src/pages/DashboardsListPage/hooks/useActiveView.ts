import { useCallback, useMemo } from 'react';
import type {
	DashboardtypesListOrderDTO,
	DashboardtypesListSortDTO,
} from 'api/generated/services/sigNoz.schemas';
import type {
	BuiltinListView,
	SavedListView,
} from 'components/ListViews/types';
import { useListViews } from 'hooks/listViews/useListViews';

import { BuiltinViewId, type DashboardViewFilter } from '../types';
import {
	areViewFiltersEqual,
	BUILTIN_VIEWS,
	builtinViewFilter,
	isClientView,
} from '../utils/views';
import { useSavedViews } from './useSavedViews';

interface UseActiveViewArgs {
	query: string;
	setQuery: (next: string) => void;
	userEmail: string;
	sortColumn: DashboardtypesListSortDTO;
	sortOrder: DashboardtypesListOrderDTO;
	setSortColumn: (column: DashboardtypesListSortDTO) => void;
	setSortOrder: (order: DashboardtypesListOrderDTO) => void;
	/** The caller's `list` grant, which saved views are gated on server-side. */
	canListDashboards: boolean;
}

export interface UseActiveViewResult {
	activeViewId: string;
	builtinViews: BuiltinListView[];
	customViews: SavedListView<DashboardViewFilter>[];
	customViewsLoading: boolean;
	isCustomActive: boolean;
	// The current query diverges from the active view's canonical query.
	isModified: boolean;
	// Whether the active view constrains the list client-side (pinned/recent).
	clientView: boolean;
	selectView: (id: string) => void;
	saveView: (name: string) => void;
	saveActiveView: () => void;
	resetView: () => void;
	removeView: (id: string) => Promise<void>;
	renameView: (id: string, name: string) => void;
}

// Dashboards' binding of `useListViews`: a view is a `{ query, sort, order }`
// filter, built-in views seed only the query, and dirty detection is a trimmed
// query compare.
export function useActiveView({
	query,
	setQuery,
	userEmail,
	sortColumn,
	sortOrder,
	setSortColumn,
	setSortOrder,
	canListDashboards,
}: UseActiveViewArgs): UseActiveViewResult {
	const api = useSavedViews({ enabled: canListDashboards });

	const filter = useMemo<DashboardViewFilter>(
		() => ({ query, sort: sortColumn, order: sortOrder }),
		[query, sortColumn, sortOrder],
	);

	const applyFilter = useCallback(
		(next: DashboardViewFilter): void => {
			setQuery(next.query);
			if (next.sort !== sortColumn) {
				setSortColumn(next.sort);
			}
			if (next.order !== sortOrder) {
				setSortOrder(next.order);
			}
		},
		[setQuery, sortColumn, sortOrder, setSortColumn, setSortOrder],
	);

	const builtinFilter = useCallback(
		(id: string, current: DashboardViewFilter): DashboardViewFilter | null =>
			builtinViewFilter(id, current, userEmail),
		[userEmail],
	);

	const views = useListViews<DashboardViewFilter>({
		filter,
		applyFilter,
		isEqual: areViewFiltersEqual,
		builtinFilter,
		defaultViewId: BuiltinViewId.All,
		api,
	});

	return {
		activeViewId: views.activeViewId,
		builtinViews: BUILTIN_VIEWS,
		customViews: views.customViews,
		customViewsLoading: api.isLoading,
		isCustomActive: views.isCustomActive,
		isModified: views.isModified,
		clientView: isClientView(views.activeViewId),
		selectView: views.selectView,
		saveView: views.saveView,
		saveActiveView: views.saveActiveView,
		resetView: views.resetView,
		removeView: views.removeView,
		renameView: views.renameView,
	};
}
