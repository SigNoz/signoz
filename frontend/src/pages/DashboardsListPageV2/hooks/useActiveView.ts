import { useCallback, useMemo } from 'react';
import { parseAsString, useQueryState, type Options } from 'nuqs';
import type {
	DashboardtypesListOrderDTO,
	DashboardtypesListSortDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	areFilterStatesEqual,
	DEFAULT_FILTER_STATE,
	filterStateToQuery,
} from '../utils/filterQuery';
import { BuiltinViewId } from '../types';
import type { DashboardFilterState, SavedView } from '../types';
import {
	BUILTIN_VIEWS,
	builtinViewSnapshot,
	type BuiltinView,
	isClientView,
} from '../utils/views';
import { useSavedViews } from './useSavedViews';

const opts: Options = { history: 'push' };

interface UseActiveViewArgs {
	filters: DashboardFilterState;
	applyFilters: (next: DashboardFilterState) => void;
	userEmail: string;
	sortColumn: DashboardtypesListSortDTO;
	sortOrder: DashboardtypesListOrderDTO;
	setSortColumn: (column: DashboardtypesListSortDTO) => void;
	setSortOrder: (order: DashboardtypesListOrderDTO) => void;
}

export interface UseActiveViewResult {
	activeViewId: string;
	builtinViews: BuiltinView[];
	customViews: SavedView[];
	customViewsLoading: boolean;
	isCustomActive: boolean;
	// Current filters diverge from the active view's canonical snapshot.
	isModified: boolean;
	// Whether the active view constrains the list client-side (pinned/recent).
	clientView: boolean;
	selectView: (id: string) => void;
	saveView: (name: string) => void;
	saveActiveView: () => void;
	resetView: () => void;
	removeView: (id: string) => void;
	renameView: (id: string, name: string) => void;
}

// The canonical filter snapshot a saved view "is": the backend stores a flat
// query, so a view folds entirely into the search box with empty chips.
const customSnapshot = (view: SavedView): DashboardFilterState => ({
	...DEFAULT_FILTER_STATE,
	search: view.query,
});

// Orchestrates the active view: which view is selected (URL `view` param),
// merging built-in + org-shared saved views, applying a view's snapshot on
// select, dirty detection, and save/reset/delete via the Views API.
export function useActiveView({
	filters,
	applyFilters,
	userEmail,
	sortColumn,
	sortOrder,
	setSortColumn,
	setSortOrder,
}: UseActiveViewArgs): UseActiveViewResult {
	const [activeViewId, setActiveViewId] = useQueryState(
		'view',
		parseAsString.withDefault(BuiltinViewId.All).withOptions(opts),
	);

	const {
		views: customViews,
		isLoading: customViewsLoading,
		createView,
		updateView,
		deleteView,
	} = useSavedViews();

	const activeCustom = useMemo(
		() => customViews.find((v) => v.id === activeViewId),
		[customViews, activeViewId],
	);

	// The filter state the active view "is" — used to detect divergence.
	const canonicalSnapshot = useMemo<DashboardFilterState | null>(
		() =>
			activeCustom
				? customSnapshot(activeCustom)
				: builtinViewSnapshot(activeViewId, userEmail),
		[activeCustom, activeViewId, userEmail],
	);

	const isModified = canonicalSnapshot
		? !areFilterStatesEqual(filters, canonicalSnapshot)
		: false;

	const selectView = useCallback(
		(id: string): void => {
			void setActiveViewId(id);
			const custom = customViews.find((v) => v.id === id);
			if (custom) {
				applyFilters(customSnapshot(custom));
				setSortColumn(custom.sort);
				setSortOrder(custom.order);
				return;
			}
			applyFilters(builtinViewSnapshot(id, userEmail) ?? DEFAULT_FILTER_STATE);
		},
		[
			setActiveViewId,
			customViews,
			applyFilters,
			userEmail,
			setSortColumn,
			setSortOrder,
		],
	);

	const saveView = useCallback(
		(name: string): void => {
			// The active view's clause already lives in the filter state (e.g. Locked
			// seeds `locked = true` into search), so the chips fold into one query.
			const query = filterStateToQuery(filters);
			void (async (): Promise<void> => {
				const created = await createView({
					name,
					query,
					sort: sortColumn,
					order: sortOrder,
				});
				if (created) {
					void setActiveViewId(created.id);
					// Re-apply the folded representation so the new view isn't
					// immediately flagged as modified.
					applyFilters(customSnapshot(created));
				}
			})();
		},
		[filters, createView, sortColumn, sortOrder, setActiveViewId, applyFilters],
	);

	const saveActiveView = useCallback((): void => {
		if (!activeCustom) {
			return;
		}
		const query = filterStateToQuery(filters);
		updateView(activeCustom.id, {
			name: activeCustom.name,
			query,
			sort: sortColumn,
			order: sortOrder,
		});
		applyFilters({ ...DEFAULT_FILTER_STATE, search: query });
	}, [activeCustom, filters, updateView, sortColumn, sortOrder, applyFilters]);

	const resetView = useCallback((): void => {
		if (!canonicalSnapshot) {
			return;
		}
		applyFilters(canonicalSnapshot);
		if (activeCustom) {
			setSortColumn(activeCustom.sort);
			setSortOrder(activeCustom.order);
		}
	}, [
		canonicalSnapshot,
		applyFilters,
		activeCustom,
		setSortColumn,
		setSortOrder,
	]);

	const removeView = useCallback(
		(id: string): void => {
			deleteView(id);
			if (activeViewId === id) {
				void setActiveViewId(BuiltinViewId.All);
				applyFilters(DEFAULT_FILTER_STATE);
			}
		},
		[deleteView, activeViewId, setActiveViewId, applyFilters],
	);

	// Rename only touches the view's name; its stored query/sort/order are preserved.
	const renameView = useCallback(
		(id: string, name: string): void => {
			const view = customViews.find((v) => v.id === id);
			if (!view) {
				return;
			}
			updateView(id, {
				name,
				query: view.query,
				sort: view.sort,
				order: view.order,
			});
		},
		[customViews, updateView],
	);

	return {
		activeViewId,
		builtinViews: BUILTIN_VIEWS,
		customViews,
		customViewsLoading,
		isCustomActive: !!activeCustom,
		isModified,
		clientView: isClientView(activeViewId),
		selectView,
		saveView,
		saveActiveView,
		resetView,
		removeView,
		renameView,
	};
}
