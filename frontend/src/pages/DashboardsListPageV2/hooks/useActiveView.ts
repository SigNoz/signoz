import { useCallback, useMemo } from 'react';
import { parseAsString, useQueryState, type Options } from 'nuqs';

import { DEFAULT_FILTER_STATE, areFilterStatesEqual } from '../filterQuery';
import { useDashboardViewsStore } from '../store/useDashboardViewsStore';
import type { DashboardFilterState, SavedView } from '../types';
import {
	BUILTIN_VIEWS,
	builtinViewQuery,
	builtinViewSnapshot,
	type BuiltinView,
	isClientView,
} from '../views';

const opts: Options = { history: 'push' };

interface UseActiveViewArgs {
	filters: DashboardFilterState;
	applyFilters: (next: DashboardFilterState) => void;
	userEmail: string;
}

export interface UseActiveViewResult {
	activeViewId: string;
	builtinViews: BuiltinView[];
	customViews: SavedView[];
	isCustomActive: boolean;
	// Current filters diverge from the active view's canonical snapshot.
	isModified: boolean;
	// Extra server-query fragment the active view contributes, and whether it
	// constrains the list client-side (favorites/recent).
	viewQuery: string;
	clientView: boolean;
	selectView: (id: string) => void;
	saveView: (name: string, icon: string) => void;
	saveActiveView: () => void;
	resetView: () => void;
	removeView: (id: string) => void;
}

// Orchestrates the active view: which view is selected (URL `view` param),
// merging built-in + persisted custom views, applying a view's snapshot on
// select, dirty detection, and save/reset/delete.
export function useActiveView({
	filters,
	applyFilters,
	userEmail,
}: UseActiveViewArgs): UseActiveViewResult {
	const [activeViewId, setActiveViewId] = useQueryState(
		'view',
		parseAsString.withDefault('all').withOptions(opts),
	);

	const customViews = useDashboardViewsStore((s) => s.customViews);
	const addView = useDashboardViewsStore((s) => s.addView);
	const updateView = useDashboardViewsStore((s) => s.updateView);
	const deleteView = useDashboardViewsStore((s) => s.deleteView);

	const activeCustom = useMemo(
		() => customViews.find((v) => v.id === activeViewId),
		[customViews, activeViewId],
	);

	// The filter state the active view "is" — used to detect divergence.
	const canonicalSnapshot = useMemo<DashboardFilterState | null>(
		() =>
			activeCustom
				? activeCustom.filters
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
			applyFilters(
				custom?.filters ??
					builtinViewSnapshot(id, userEmail) ??
					DEFAULT_FILTER_STATE,
			);
		},
		[setActiveViewId, customViews, applyFilters, userEmail],
	);

	const saveView = useCallback(
		(name: string, icon: string): void => {
			const id = `cv_${Date.now()}`;
			addView({
				id,
				name: name.trim(),
				icon,
				filters: { ...filters },
				createdAt: Date.now(),
			});
			void setActiveViewId(id);
		},
		[addView, filters, setActiveViewId],
	);

	const saveActiveView = useCallback((): void => {
		if (activeCustom) {
			updateView(activeCustom.id, { filters: { ...filters } });
		}
	}, [activeCustom, updateView, filters]);

	const resetView = useCallback((): void => {
		if (canonicalSnapshot) {
			applyFilters(canonicalSnapshot);
		}
	}, [canonicalSnapshot, applyFilters]);

	const removeView = useCallback(
		(id: string): void => {
			deleteView(id);
			if (activeViewId === id) {
				void setActiveViewId('all');
				applyFilters(DEFAULT_FILTER_STATE);
			}
		},
		[deleteView, activeViewId, setActiveViewId, applyFilters],
	);

	return {
		activeViewId,
		builtinViews: BUILTIN_VIEWS,
		customViews,
		isCustomActive: !!activeCustom,
		isModified,
		viewQuery: builtinViewQuery(activeViewId),
		clientView: isClientView(activeViewId),
		selectView,
		saveView,
		saveActiveView,
		resetView,
		removeView,
	};
}
