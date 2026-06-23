// Built-in view catalogue + the pure logic that maps a view to how it
// constrains the list. Views fall into three mechanisms:
//   - snapshot:  selecting applies a filter snapshot (All, My dashboards, custom)
//   - query:     contributes an extra server clause AND-ed with the chips (Locked)
//   - client:    constrains by a client-side id set (Favorites, Recently viewed)
import {
	Activity,
	Bookmark,
	Clock,
	Code,
	Flag,
	Layers,
	Lock,
	Server,
	Star,
	Tag,
	User,
} from '@signozhq/icons';

import { DEFAULT_FILTER_STATE } from './filterQuery';
import type { BuiltinViewId, DashboardFilterState, ViewSection } from './types';
import type { DashboardListItem } from './utils';

// All @signozhq icons share this component type.
export type ViewIcon = typeof Star;

export interface BuiltinView {
	id: BuiltinViewId;
	label: string;
	icon: ViewIcon;
	section: Exclude<ViewSection, 'custom'>;
}

export const BUILTIN_VIEWS: BuiltinView[] = [
	{ id: 'mine', label: 'My dashboards', icon: User, section: 'personal' },
	{ id: 'favorites', label: 'Favorites', icon: Star, section: 'personal' },
	{ id: 'recent', label: 'Recently viewed', icon: Clock, section: 'personal' },
	{ id: 'all', label: 'All dashboards', icon: Layers, section: 'system' },
	{ id: 'locked', label: 'Locked', icon: Lock, section: 'system' },
];

// Icons offered when naming a saved view; stored by name on the view.
export const VIEW_ICON_OPTIONS: { name: string; Icon: ViewIcon }[] = [
	{ name: 'bookmark', Icon: Bookmark },
	{ name: 'star', Icon: Star },
	{ name: 'layers', Icon: Layers },
	{ name: 'activity', Icon: Activity },
	{ name: 'server', Icon: Server },
	{ name: 'code', Icon: Code },
	{ name: 'flag', Icon: Flag },
	{ name: 'tag', Icon: Tag },
	{ name: 'lock', Icon: Lock },
	{ name: 'clock', Icon: Clock },
];

const ICON_BY_NAME = new Map(VIEW_ICON_OPTIONS.map((o) => [o.name, o.Icon]));

export const iconByName = (name: string): ViewIcon =>
	ICON_BY_NAME.get(name) ?? Bookmark;

// Favorites/Recently-viewed constrain by a client-side id set — the backend has
// no id filter, so these are filtered on the fetched rows.
export const isClientView = (id: string): boolean =>
	id === 'favorites' || id === 'recent';

// Extra server query fragment a built-in view contributes (AND-ed with chips).
export const builtinViewQuery = (id: string): string =>
	id === 'locked' ? 'locked = true' : '';

// The canonical filter snapshot a built-in view applies when selected. `null`
// for ids that aren't built-in (custom views carry their own snapshot).
export const builtinViewSnapshot = (
	id: string,
	userEmail: string,
): DashboardFilterState | null => {
	switch (id) {
		case 'mine':
			return {
				...DEFAULT_FILTER_STATE,
				createdBy: userEmail ? [userEmail] : [],
			};
		case 'all':
		case 'favorites':
		case 'recent':
		case 'locked':
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
		case 'favorites':
			return {
				title: 'No favorite dashboards yet',
				description: 'Star a dashboard to pin it here.',
			};
		case 'recent':
			return {
				title: 'No recently viewed dashboards',
				description: 'Dashboards you open will appear here.',
			};
		case 'locked':
			return {
				title: 'No locked dashboards',
				description: 'Dashboards locked for editing will appear here.',
			};
		case 'mine':
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

// Apply a client-side view's id-set constraint to already-fetched rows.
// Recently-viewed preserves visit order regardless of the active sort.
export const applyClientView = (
	items: DashboardListItem[],
	id: string,
	favorites: string[],
	recent: string[],
): DashboardListItem[] => {
	if (id === 'favorites') {
		const set = new Set(favorites);
		return items.filter((d) => set.has(d.id));
	}
	if (id === 'recent') {
		const order = new Map(recent.map((rid, index) => [rid, index]));
		return items
			.filter((d) => order.has(d.id))
			.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
	}
	return items;
};
