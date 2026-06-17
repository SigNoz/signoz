import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import useUrlQuery from 'hooks/useUrlQuery';

import type { SourceFilter } from './types';

const SEARCH_KEY = 'q';
const SOURCE_KEY = 'source';
const PAGE_KEY = 'page';

const DEFAULT_SOURCE: SourceFilter = 'all';

export interface ModelPricingFilters {
	search: string;
	source: SourceFilter;
	page: number;
	setSearch: (value: string) => void;
	setSource: (value: SourceFilter) => void;
	setPage: (value: number) => void;
}

const isSourceFilter = (value: string | null): value is SourceFilter =>
	value === 'all' || value === 'auto' || value === 'override';

// Keeps the model-cost list filters (search / source / page) in the URL so the
// view is shareable and reload-safe. These map straight onto the list request
// params (q, source, offset), making the table backend-driven once the API
// honours them.
export function useModelPricingFilters(): ModelPricingFilters {
	const history = useHistory();
	const urlQuery = useUrlQuery();

	const search = urlQuery.get(SEARCH_KEY) ?? '';
	const sourceParam = urlQuery.get(SOURCE_KEY);
	const source = isSourceFilter(sourceParam) ? sourceParam : DEFAULT_SOURCE;
	const page = Math.max(1, Number(urlQuery.get(PAGE_KEY)) || 1);

	const setParam = useCallback(
		(key: string, value: string | null, resetPage: boolean): void => {
			const next = new URLSearchParams(urlQuery.toString());
			if (value) {
				next.set(key, value);
			} else {
				next.delete(key);
			}
			// Filter changes invalidate the current page offset.
			if (resetPage) {
				next.delete(PAGE_KEY);
			}
			history.replace({ search: next.toString() });
		},
		[history, urlQuery],
	);

	const setSearch = useCallback(
		(value: string): void => setParam(SEARCH_KEY, value.trim(), true),
		[setParam],
	);

	const setSource = useCallback(
		(value: SourceFilter): void =>
			// 'all' is the default, so keep it out of the URL.
			setParam(SOURCE_KEY, value === DEFAULT_SOURCE ? null : value, true),
		[setParam],
	);

	const setPage = useCallback(
		(value: number): void =>
			setParam(PAGE_KEY, value <= 1 ? null : String(value), false),
		[setParam],
	);

	return { search, source, page, setSearch, setSource, setPage };
}
