import { useState } from 'react';
import { parseAsInteger, useQueryState } from 'nuqs';

import { SortState } from './types';
import { parseAsJsonNoValidate } from 'utils/nuqsParsers';

const NUQS_OPTIONS = { history: 'push' as const };
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;

type Defaults = { page?: number; limit?: number; orderBy?: SortState | null };

type TableParamsResult = {
	page: number;
	limit: number;
	orderBy: SortState | null;
	setPage: (p: number) => void;
	setLimit: (l: number) => void;
	setOrderBy: (s: SortState | null) => void;
};

export function useTableParams(
	enableQueryParams?: boolean | string,
	defaults?: Defaults,
): TableParamsResult {
	const prefix = typeof enableQueryParams === 'string' ? enableQueryParams : '';
	const sep = prefix ? '_' : '';
	const pageDefault = defaults?.page ?? DEFAULT_PAGE;
	const limitDefault = defaults?.limit ?? DEFAULT_LIMIT;
	const orderByDefault = defaults?.orderBy ?? null;

	const [localPage, setLocalPage] = useState(pageDefault);
	const [localLimit, setLocalLimit] = useState(limitDefault);
	const [localOrderBy, setLocalOrderBy] = useState<SortState | null>(
		orderByDefault,
	);

	const [urlPage, setUrlPage] = useQueryState(
		`${prefix}${sep}page`,
		parseAsInteger.withDefault(pageDefault).withOptions(NUQS_OPTIONS),
	);
	const [urlLimit, setUrlLimit] = useQueryState(
		`${prefix}${sep}limit`,
		parseAsInteger.withDefault(limitDefault).withOptions(NUQS_OPTIONS),
	);
	const [urlOrderBy, setUrlOrderBy] = useQueryState(
		`${prefix}${sep}order_by`,
		parseAsJsonNoValidate<SortState | null>()
			.withDefault(orderByDefault as never)
			.withOptions(NUQS_OPTIONS),
	);

	if (enableQueryParams) {
		return {
			page: urlPage,
			limit: urlLimit,
			orderBy: urlOrderBy as SortState | null,
			setPage: setUrlPage,
			setLimit: setUrlLimit,
			setOrderBy: setUrlOrderBy,
		};
	}

	return {
		page: localPage,
		limit: localLimit,
		orderBy: localOrderBy,
		setPage: setLocalPage,
		setLimit: setLocalLimit,
		setOrderBy: setLocalOrderBy,
	};
}
