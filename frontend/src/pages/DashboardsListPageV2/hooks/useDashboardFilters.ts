import { useCallback, useMemo } from 'react';
import {
	parseAsArrayOf,
	parseAsString,
	parseAsStringLiteral,
	useQueryState,
	type Options,
} from 'nuqs';

import {
	DEFAULT_FILTER_STATE,
	filterStateToQuery,
	isFilterStateEmpty,
} from '../utils/filterQuery';
import type {
	DashboardFilterState,
	SelectedTag,
	UpdatedWindow,
} from '../types';

const UPDATED_WINDOWS: UpdatedWindow[] = ['any', 'today', '7d', '30d'];

const opts: Options = { history: 'push' };

// Tags are carried in the URL as `key:value` strings; split on the first colon.
const parseTag = (raw: string): SelectedTag | null => {
	const idx = raw.indexOf(':');
	if (idx <= 0) {
		return null;
	}
	return { key: raw.slice(0, idx), value: raw.slice(idx + 1) };
};

const serializeTag = (tag: SelectedTag): string => `${tag.key}:${tag.value}`;

export interface UseDashboardFiltersResult {
	filters: DashboardFilterState;
	// The backend list-filter `query` string derived from the current filters.
	query: string;
	isEmpty: boolean;
	setSearch: (value: string) => void;
	setCreatedBy: (emails: string[]) => void;
	setUpdated: (window: UpdatedWindow) => void;
	setTags: (tags: SelectedTag[]) => void;
	// Replace the whole filter state at once — used when applying a saved view.
	applyFilters: (next: DashboardFilterState) => void;
	clearAll: () => void;
}

// Owns the dashboards-list filter state, synced to the URL (shareable links,
// back/forward) and projected into the backend `query` string. Sort/order/page
// live in their own query-param hooks; this hook is filters-only.
export function useDashboardFilters(): UseDashboardFiltersResult {
	const [search, setSearchState] = useQueryState(
		'search',
		parseAsString.withDefault('').withOptions(opts),
	);
	const [createdBy, setCreatedByState] = useQueryState(
		'createdBy',
		parseAsArrayOf(parseAsString).withDefault([]).withOptions(opts),
	);
	const [updated, setUpdatedState] = useQueryState(
		'updated',
		parseAsStringLiteral(UPDATED_WINDOWS).withDefault('any').withOptions(opts),
	);
	const [tagStrings, setTagStringsState] = useQueryState(
		'tags',
		parseAsArrayOf(parseAsString).withDefault([]).withOptions(opts),
	);

	const tags = useMemo<SelectedTag[]>(
		() => tagStrings.map(parseTag).filter((t): t is SelectedTag => t !== null),
		[tagStrings],
	);

	const filters = useMemo<DashboardFilterState>(
		() => ({ search, createdBy, updated, tags }),
		[search, createdBy, updated, tags],
	);

	const query = useMemo(() => filterStateToQuery(filters), [filters]);

	const setSearch = useCallback(
		(value: string): void => {
			void setSearchState(value);
		},
		[setSearchState],
	);

	const setCreatedBy = useCallback(
		(emails: string[]): void => {
			void setCreatedByState(emails.length ? emails : null);
		},
		[setCreatedByState],
	);

	const setUpdated = useCallback(
		(window: UpdatedWindow): void => {
			void setUpdatedState(window);
		},
		[setUpdatedState],
	);

	const setTags = useCallback(
		(next: SelectedTag[]): void => {
			void setTagStringsState(next.length ? next.map(serializeTag) : null);
		},
		[setTagStringsState],
	);

	const applyFilters = useCallback(
		(next: DashboardFilterState): void => {
			void setSearchState(next.search || null);
			void setCreatedByState(next.createdBy.length ? next.createdBy : null);
			void setUpdatedState(next.updated);
			void setTagStringsState(
				next.tags.length ? next.tags.map(serializeTag) : null,
			);
		},
		[setSearchState, setCreatedByState, setUpdatedState, setTagStringsState],
	);

	const clearAll = useCallback((): void => {
		applyFilters(DEFAULT_FILTER_STATE);
	}, [applyFilters]);

	return {
		filters,
		query,
		isEmpty: isFilterStateEmpty(filters),
		setSearch,
		setCreatedBy,
		setUpdated,
		setTags,
		applyFilters,
		clearAll,
	};
}
