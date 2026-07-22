import type {
	DashboardtypesListOrderDTO,
	DashboardtypesListSortDTO,
} from 'api/generated/services/sigNoz.schemas';

// Relative "updated within" windows offered by the Updated filter dropdown.
export type UpdatedWindow = 'any' | 'today' | '7d' | '30d';

// A saved view: a named filter the org shares, persisted via the backend Views
// API. The backend stores a flat `{ query, sort, order }` (no structured chips),
// so a view captures the fully-combined DSL query plus the sort/order to apply.
export interface SavedView {
	id: string;
	name: string;
	query: string;
	sort: DashboardtypesListSortDTO;
	order: DashboardtypesListOrderDTO;
}

// The payload for creating or updating a saved view (everything but the id).
export type SavedViewInput = Omit<SavedView, 'id'>;

// Built-in views rendered above the user's saved views. Their result set is
// derived (a fixed query fragment or a client-side id set), never persisted.
// String values double as the URL `view` param, so they must stay stable.
export enum BuiltinViewId {
	Mine = 'mine',
	Pinned = 'pinned',
	Recent = 'recent',
	All = 'all',
	Locked = 'locked',
}

export type ViewSection = 'personal' | 'system' | 'custom';
