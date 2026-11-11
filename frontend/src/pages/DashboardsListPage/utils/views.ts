import { areQueriesEqual } from 'components/ListFilter/dsl/filterQuery';
import type { EmptyStateCopy } from 'components/ListViews/types';

import { findBuiltinView } from '../list.config';
import type { DashboardViewFilter } from '../types';

// A view is dirty only when its query diverges; sort/order changes don't count.
export const areViewFiltersEqual = (
	a: DashboardViewFilter,
	b: DashboardViewFilter,
): boolean => areQueriesEqual(a.query, b.query);

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
	const viewCopy = findBuiltinView(activeViewId)?.emptyState;
	if (viewCopy) {
		return viewCopy;
	}
	return hasActiveFilters
		? {
				title: 'No dashboards match your filters',
				description: 'Try adjusting or clearing your filters.',
			}
		: {
				title: 'No dashboards found',
				description: 'Create a dashboard to get started.',
			};
};
