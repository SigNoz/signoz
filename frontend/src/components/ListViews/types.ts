import type { Pin } from '@signozhq/icons';

// All @signozhq icons share this component type.
export type ListViewIcon = typeof Pin;

export interface BuiltinListView {
	id: string;
	label: string;
	icon: ListViewIcon;
	section: 'personal' | 'system';
}

export interface SavedListView<F> {
	id: string;
	name: string;
	filter: F;
}

export interface SavedListViewsApi<F> {
	views: SavedListView<F>[];
	isLoading: boolean;
	createView: (name: string, filter: F) => Promise<SavedListView<F> | null>;
	updateView: (id: string, name: string, filter: F) => void;
	deleteView: (id: string) => Promise<void>;
}

export type ViewSaveMode = 'new' | 'update';
