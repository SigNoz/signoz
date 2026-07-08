// Built-in view catalogue + the pure logic that maps a view to how it
// constrains the list. Views fall into two mechanisms:
//   - snapshot:  selecting applies a filter snapshot — some seed the search box
//                with DSL (My dashboards → created_by; Locked → locked = true)
//   - client:    constrains by a client-side id set (Favorites, Recently viewed)
import { Clock, Layers, Lock, Pin, User } from '@signozhq/icons';

import { DEFAULT_FILTER_STATE } from './filterQuery';
import { BuiltinViewId } from '../types';
import type { DashboardFilterState, ViewSection } from '../types';
import type { DashboardListItem } from './helpers';

// All @signozhq icons share this component type.
export type ViewIcon = typeof Pin;

export interface BuiltinView {
	id: BuiltinViewId;
	label: string;
	icon: ViewIcon;
	section: Exclude<ViewSection, 'custom'>;
}

export const BUILTIN_VIEWS: BuiltinView[] = [
	{
		id: BuiltinViewId.Mine,
		label: 'My dashboards',
		icon: User,
		section: 'personal',
	},
	{ id: BuiltinViewId.Pinned, label: 'Pinned', icon: Pin, section: 'personal' },
	{
		id: BuiltinViewId.Recent,
		label: 'Recently viewed',
		icon: Clock,
		section: 'personal',
	},
	{
		id: BuiltinViewId.All,
		label: 'All dashboards',
		icon: Layers,
		section: 'system',
	},
	{ id: BuiltinViewId.Locked, label: 'Locked', icon: Lock, section: 'system' },
];

// Pinned/Recently-viewed constrain client-side — Pinned by the per-row `pinned`
// flag, Recently-viewed by a localStorage id set — so they filter the fetched
// rows rather than adding a server clause.
export const isClientView = (id: string): boolean =>
	id === BuiltinViewId.Pinned || id === BuiltinViewId.Recent;

// DSL the Locked view seeds into the search box, so the constraint is visible
// (and editable) rather than applied invisibly behind the scenes.
export const LOCKED_QUERY = 'locked = true';

// The canonical filter snapshot a built-in view applies when selected. `null`
// for ids that aren't built-in (custom views carry their own snapshot).
export const builtinViewSnapshot = (
	id: string,
	userEmail: string,
): DashboardFilterState | null => {
	switch (id) {
		case BuiltinViewId.Mine:
			return {
				...DEFAULT_FILTER_STATE,
				createdBy: userEmail ? [userEmail] : [],
			};
		case BuiltinViewId.Locked:
			return { ...DEFAULT_FILTER_STATE, search: LOCKED_QUERY };
		case BuiltinViewId.All:
		case BuiltinViewId.Pinned:
		case BuiltinViewId.Recent:
			return { ...DEFAULT_FILTER_STATE };
		default:
			return null;
	}
};

export interface EmptyStateCopy {
	title: string;
	description: string;
}

// Context-aware copy for the no-results state, so an empty Locked view doesn't
// read like a failed search ("No dashboards found for .").
export const noResultsCopy = (
	activeViewId: string,
	search: string,
	hasActiveFilters: boolean,
): EmptyStateCopy => {
	const trimmed = search.trim();
	if (trimmed) {
		return {
			title: `No dashboards match "${trimmed}"`,
			description: 'Try a different search term or clear your filters.',
		};
	}
	switch (activeViewId) {
		case BuiltinViewId.Pinned:
			return {
				title: 'No pinned dashboards yet',
				description: 'Pin a dashboard to keep it handy here.',
			};
		case BuiltinViewId.Recent:
			return {
				title: 'No recently viewed dashboards',
				description: 'Dashboards you open will appear here.',
			};
		case BuiltinViewId.Locked:
			return {
				title: 'No locked dashboards',
				description: 'Dashboards locked for editing will appear here.',
			};
		case BuiltinViewId.Mine:
			return {
				title: "You haven't created any dashboards",
				description: 'Dashboards you create will appear here.',
			};
		default:
			return hasActiveFilters
				? {
						title: 'No dashboards match your filters',
						description: 'Try adjusting or clearing your filters.',
					}
				: {
						title: 'No dashboards found',
						description: 'Create a dashboard to get started.',
					};
	}
};

// Apply a client-side view's constraint to already-fetched rows. Pinned filters
// by the per-row `pinned` flag; Recently-viewed filters by a localStorage id set
// and preserves visit order regardless of the active sort.
export const applyClientView = (
	items: DashboardListItem[],
	id: string,
	recent: string[],
): DashboardListItem[] => {
	if (id === BuiltinViewId.Pinned) {
		return items.filter((d) => d.pinned);
	}
	if (id === BuiltinViewId.Recent) {
		const order = new Map(recent.map((rid, index) => [rid, index]));
		return items
			.filter((d) => order.has(d.id))
			.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
	}
	return items;
};
