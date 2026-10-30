import { useCallback, useMemo } from 'react';
import { parseAsString, useQueryState } from 'nuqs';

import type { UseListViewsArgs, UseListViewsResult } from './types';

// Orchestrates a list page's active view: which view is selected (URL param),
// applying a view's filter on select, dirty detection, and save/reset/delete
// via the page's saved-views API.
export function useListViews<F>({
	filter,
	applyFilter,
	isEqual,
	builtinFilter,
	defaultViewId,
	api,
	urlParam = 'view',
}: UseListViewsArgs<F>): UseListViewsResult<F> {
	const [activeViewId, setActiveViewId] = useQueryState(
		urlParam,
		parseAsString.withDefault(defaultViewId).withOptions({ history: 'push' }),
	);

	const { views: customViews, createView, updateView, deleteView } = api;

	const activeView = useMemo(
		() => customViews.find((v) => v.id === activeViewId),
		[customViews, activeViewId],
	);

	// The filter the active view "is" — used to detect divergence.
	const canonicalFilter = useMemo<F | null>(
		() => (activeView ? activeView.filter : builtinFilter(activeViewId, filter)),
		[activeView, builtinFilter, activeViewId, filter],
	);

	const isModified =
		canonicalFilter !== null && !isEqual(filter, canonicalFilter);

	const selectView = useCallback(
		(id: string): void => {
			void setActiveViewId(id);
			const custom = customViews.find((v) => v.id === id);
			const next = custom
				? custom.filter
				: (builtinFilter(id, filter) ?? builtinFilter(defaultViewId, filter));
			if (next !== null) {
				applyFilter(next);
			}
		},
		[
			setActiveViewId,
			customViews,
			builtinFilter,
			filter,
			defaultViewId,
			applyFilter,
		],
	);

	const saveView = useCallback(
		(name: string): void => {
			void (async (): Promise<void> => {
				const created = await createView(name, filter);
				if (created) {
					void setActiveViewId(created.id);
				}
			})();
		},
		[createView, filter, setActiveViewId],
	);

	const saveActiveView = useCallback((): void => {
		if (!activeView) {
			return;
		}
		updateView(activeView.id, activeView.name, filter);
	}, [activeView, updateView, filter]);

	const resetView = useCallback((): void => {
		if (canonicalFilter === null) {
			return;
		}
		applyFilter(canonicalFilter);
	}, [canonicalFilter, applyFilter]);

	const removeView = useCallback(
		async (id: string): Promise<void> => {
			try {
				await deleteView(id);
			} catch {
				// Failure is surfaced by the delete mutation's error toast; still
				// settle so the confirm modal stops loading and closes.
				return;
			}
			if (activeViewId === id) {
				void setActiveViewId(defaultViewId);
				const next = builtinFilter(defaultViewId, filter);
				if (next !== null) {
					applyFilter(next);
				}
			}
		},
		[
			deleteView,
			activeViewId,
			setActiveViewId,
			defaultViewId,
			builtinFilter,
			filter,
			applyFilter,
		],
	);

	// Rename only touches the view's name; its stored filter is preserved.
	const renameView = useCallback(
		(id: string, name: string): void => {
			const view = customViews.find((v) => v.id === id);
			if (!view) {
				return;
			}
			updateView(id, name, view.filter);
		},
		[customViews, updateView],
	);

	return {
		activeViewId,
		activeView,
		customViews,
		isCustomActive: !!activeView,
		isModified,
		selectView,
		saveView,
		saveActiveView,
		resetView,
		removeView,
		renameView,
	};
}
