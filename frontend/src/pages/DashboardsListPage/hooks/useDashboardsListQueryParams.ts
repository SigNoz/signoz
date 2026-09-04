import {
	DashboardtypesListOrderDTO,
	DashboardtypesListSortDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryState,
	type Options,
	type UseQueryStateReturn,
} from 'nuqs';

export const SORT_COLUMNS = Object.values(DashboardtypesListSortDTO);
export const SORT_ORDERS = Object.values(DashboardtypesListOrderDTO);

const opts: Options = { history: 'push' };

export const useSortColumn = (): UseQueryStateReturn<
	DashboardtypesListSortDTO,
	DashboardtypesListSortDTO
> =>
	useQueryState(
		'sort',
		parseAsStringLiteral(SORT_COLUMNS)
			.withDefault(DashboardtypesListSortDTO.updated_at)
			.withOptions(opts),
	);

export const useSortOrder = (): UseQueryStateReturn<
	DashboardtypesListOrderDTO,
	DashboardtypesListOrderDTO
> =>
	useQueryState(
		'order',
		parseAsStringLiteral(SORT_ORDERS)
			.withDefault(DashboardtypesListOrderDTO.desc)
			.withOptions(opts),
	);

export const usePage = (): UseQueryStateReturn<number, number> =>
	useQueryState('page', parseAsInteger.withDefault(1).withOptions(opts));

export const useSearch = (): UseQueryStateReturn<string, string> =>
	useQueryState('search', parseAsString.withDefault('').withOptions(opts));
