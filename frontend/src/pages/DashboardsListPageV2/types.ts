// Relative "updated within" windows offered by the Updated filter chip.
export type UpdatedWindow = 'any' | 'today' | '7d' | '30d';

// The user-controllable filter state a view captures. (Tags are intentionally
// excluded for now — the tag filter UI is deferred.) Sort/order are handled
// separately via URL query params and are not part of a view snapshot.
export interface DashboardFilterState {
	search: string;
	createdBy: string[]; // emails (created_by)
	updated: UpdatedWindow;
}

// A saved view: a named, iconed snapshot of filter state. Persisted client-side
// (localStorage) until the views API lands.
export interface SavedView {
	id: string;
	name: string;
	icon: string; // @signozhq/icons icon name
	filters: DashboardFilterState;
	createdAt: number;
}

// Built-in views rendered above the user's saved views. Their result set is
// derived (a fixed query fragment or a client-side id set), never persisted.
export type BuiltinViewId = 'mine' | 'favorites' | 'recent' | 'all' | 'locked';

export type ViewSection = 'personal' | 'system' | 'custom';
