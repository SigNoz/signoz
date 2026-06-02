import {
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryState,
	type Options,
	type UseQueryStateReturn,
} from 'nuqs';

export const SORT_COLUMNS = ['updated_at', 'created_at', 'name'] as const;
export type SortColumn = (typeof SORT_COLUMNS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

const opts: Options = { history: 'push' };

export const useSortColumn = (): UseQueryStateReturn<SortColumn, SortColumn> =>
	useQueryState(
		'sort',
		parseAsStringLiteral(SORT_COLUMNS)
			.withDefault('updated_at')
			.withOptions(opts),
	);

export const useSortOrder = (): UseQueryStateReturn<SortOrder, SortOrder> =>
	useQueryState(
		'order',
		parseAsStringLiteral(SORT_ORDERS).withDefault('desc').withOptions(opts),
	);

export const usePage = (): UseQueryStateReturn<number, number> =>
	useQueryState('page', parseAsInteger.withDefault(1).withOptions(opts));

export const useSearch = (): UseQueryStateReturn<string, string> =>
	useQueryState('search', parseAsString.withDefault('').withOptions(opts));
