import type {
	BuiltinViewConfig,
	SavedListView,
	SavedListViewsApi,
} from 'components/ListViews/types';

export interface UseListViewsArgs<F, Ctx> {
	/** The currently applied filter. */
	filter: F;
	applyFilter: (next: F) => void;
	isEqual: (a: F, b: F) => boolean;
	builtinViews: readonly Pick<BuiltinViewConfig<F, Ctx>, 'id' | 'filter'>[];
	/** Passed to each built-in view's `filter`. */
	ctx: Ctx;
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
