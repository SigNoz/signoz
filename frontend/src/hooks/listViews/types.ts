import type {
	SavedListView,
	SavedListViewsApi,
} from 'components/ListViews/types';

export interface UseListViewsArgs<F> {
	/** The currently applied filter. */
	filter: F;
	applyFilter: (next: F) => void;
	isEqual: (a: F, b: F) => boolean;
	/** The filter a builtin view applies given the current one; `null` when `id` is not builtin. */
	builtinFilter: (id: string, current: F) => F | null;
	defaultViewId: string;
	api: SavedListViewsApi<F>;
	/** URL search param holding the active view id. */
	urlParam?: string;
}

export interface UseListViewsResult<F> {
	activeViewId: string;
	activeView: SavedListView<F> | undefined;
	customViews: SavedListView<F>[];
	isCustomActive: boolean;
	/** The current filter diverges from the active view's canonical filter. */
	isModified: boolean;
	selectView: (id: string) => void;
	saveView: (name: string) => void;
	saveActiveView: () => void;
	resetView: () => void;
	removeView: (id: string) => Promise<void>;
	renameView: (id: string, name: string) => void;
}
