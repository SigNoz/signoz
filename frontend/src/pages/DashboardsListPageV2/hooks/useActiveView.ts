import { useCallback, useMemo } from 'react';
import { type Options, parseAsString, useQueryState } from 'nuqs';
import type {
	DashboardtypesListOrderDTO,
	DashboardtypesListSortDTO,
} from 'api/generated/services/sigNoz.schemas';

import { areQueriesEqual } from '../utils/filterQuery';
import { BuiltinViewId } from '../types';
import type { SavedView } from '../types';
import {
	BUILTIN_VIEWS,
	type BuiltinView,
	builtinViewQuery,
	isClientView,
} from '../utils/views';
import { useSavedViews } from './useSavedViews';

const opts: Options = { history: 'push' };

interface UseActiveViewArgs {
	query: string;
	setQuery: (next: string) => void;
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
	// The current query diverges from the active view's canonical query.
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

// Orchestrates the active view: which view is selected (URL `view` param),
// merging built-in + org-shared saved views, applying a view's query on select,
// dirty detection, and save/reset/delete via the Views API. A view now simply
// "is" a query string, so dirty detection is a trimmed string compare.
export function useActiveView({
	query,
	setQuery,
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

	// The query the active view "is" — used to detect divergence.
	const canonicalQuery = useMemo<string | null>(
		() =>
			activeCustom
				? activeCustom.query
				: builtinViewQuery(activeViewId, userEmail),
		[activeCustom, activeViewId, userEmail],
	);

	const isModified =
		canonicalQuery !== null && !areQueriesEqual(query, canonicalQuery);

	const selectView = useCallback(
		(id: string): void => {
			void setActiveViewId(id);
			const custom = customViews.find((v) => v.id === id);
			if (custom) {
				setQuery(custom.query);
				setSortColumn(custom.sort);
				setSortOrder(custom.order);
				return;
			}
			setQuery(builtinViewQuery(id, userEmail) ?? '');
		},
		[
			setActiveViewId,
			customViews,
			setQuery,
			userEmail,
			setSortColumn,
			setSortOrder,
		],
	);

	const saveView = useCallback(
		(name: string): void => {
			void (async (): Promise<void> => {
				const created = await createView({
					name,
					query,
					sort: sortColumn,
					order: sortOrder,
				});
				if (created) {
					void setActiveViewId(created.id);
				}
			})();
		},
		[query, createView, sortColumn, sortOrder, setActiveViewId],
	);

	const saveActiveView = useCallback((): void => {
		if (!activeCustom) {
			return;
		}
		updateView(activeCustom.id, {
			name: activeCustom.name,
			query,
			sort: sortColumn,
			order: sortOrder,
		});
	}, [activeCustom, query, updateView, sortColumn, sortOrder]);

	const resetView = useCallback((): void => {
		if (canonicalQuery === null) {
			return;
		}
		setQuery(canonicalQuery);
		if (activeCustom) {
			setSortColumn(activeCustom.sort);
			setSortOrder(activeCustom.order);
		}
	}, [canonicalQuery, setQuery, activeCustom, setSortColumn, setSortOrder]);

	const removeView = useCallback(
		(id: string): void => {
			deleteView(id);
			if (activeViewId === id) {
				void setActiveViewId(BuiltinViewId.All);
				setQuery('');
			}
		},
		[deleteView, activeViewId, setActiveViewId, setQuery],
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
