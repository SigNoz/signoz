import { ControlsProps } from 'container/Controls';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { useCallback, useEffect } from 'react';

import { defaultPaginationConfig, URL_PAGINATION } from './config';
import { Pagination } from './types';

const useQueryPagination = (totalCount: number): UseQueryPagination => {
	//! add data the validation checker
	const {
		query: paginationQuery,
		queryData: paginationQueryData,
		redirectWithQuery: redirectWithCurrentPagination,
	} = useUrlQueryData<Pagination>(URL_PAGINATION);

	const handleCountItemsPerPageChange = useCallback(
		(newLimit: Pagination['limit']) => {
			redirectWithCurrentPagination({
				...paginationQueryData,
				limit: newLimit,
			});
		},
		[paginationQueryData, redirectWithCurrentPagination],
	);

	const handleNavigatePrevious = useCallback(() => {
		const previousOffset = paginationQueryData.offset - paginationQueryData.limit;

		redirectWithCurrentPagination({
			...paginationQueryData,
			offset: previousOffset > 0 ? previousOffset : 0,
		});
	}, [paginationQueryData, redirectWithCurrentPagination]);

	const handleNavigateNext = useCallback(() => {
		redirectWithCurrentPagination({
			...paginationQueryData,
			offset:
				paginationQueryData.limit === totalCount
					? paginationQueryData.offset + paginationQueryData.limit
					: paginationQueryData.offset,
		});
	}, [totalCount, paginationQueryData, redirectWithCurrentPagination]);

	useEffect(() => {
		if (paginationQuery) return;

		redirectWithCurrentPagination(defaultPaginationConfig);
	}, [paginationQuery, redirectWithCurrentPagination]);

	return {
		pagination: paginationQueryData || defaultPaginationConfig,
		handleCountItemsPerPageChange,
		handleNavigatePrevious,
		handleNavigateNext,
	};
};

type UseQueryPagination = Pick<
	ControlsProps,
	| 'handleCountItemsPerPageChange'
	| 'handleNavigateNext'
	| 'handleNavigatePrevious'
> & { pagination: Pagination };

export default useQueryPagination;
