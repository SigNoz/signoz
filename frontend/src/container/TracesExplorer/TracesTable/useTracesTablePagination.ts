import { useEffect, useMemo, useState } from 'react';
import {
	SetPageOptions,
	useTableParams,
} from 'components/TanStackTableView/useTableParams';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Pagination } from 'hooks/queryPagination';

import {
	TRACES_TABLE_DEFAULT_LIMIT,
	TRACES_TABLE_PAGE_SIZE_KEY,
	TRACES_TABLE_QUERY_PARAMS,
} from './constants';

export type TracesTablePagination = {
	page: number;
	limit: number;
	request: Pagination;
	setPage: (page: number, options?: SetPageOptions) => void;
	setLimit: (limit: number) => void;
};

export function useTracesTablePagination(): TracesTablePagination {
	const { page, limit, setPage, setLimit } = useTableParams(
		TRACES_TABLE_QUERY_PARAMS,
		{
			page: 1,
			limit: TRACES_TABLE_DEFAULT_LIMIT,
			storageKey: TRACES_TABLE_PAGE_SIZE_KEY,
		},
	);

	const { stagedQuery } = useQueryBuilder();
	const queryId = stagedQuery?.id;
	const [pageQueryId, setPageQueryId] = useState(queryId);
	// A page number only means something for the query it was picked on, so a
	// new query reads page 1 before the URL catches up.
	const isNewQuery = !!pageQueryId && pageQueryId !== queryId;
	const currentPage = isNewQuery ? 1 : page;

	useEffect(() => {
		if (isNewQuery) {
			setPage(1, { history: 'replace' });
		}
		setPageQueryId(queryId);
	}, [isNewQuery, queryId, setPage]);

	const request = useMemo(
		() => ({ offset: (currentPage - 1) * limit, limit }),
		[currentPage, limit],
	);

	return { page: currentPage, limit, request, setPage, setLimit };
}
