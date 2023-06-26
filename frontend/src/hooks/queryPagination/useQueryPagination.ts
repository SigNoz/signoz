import { ControlsProps } from 'container/Controls';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { useCallback, useEffect } from 'react';

import { defaultPaginationConfig, URL_PAGINATION } from './config';
import { Pagination } from './types';
import { checkIsValidPaginationData } from './utils';

const useQueryPagination = (totalCount: number): UseQueryPagination => {
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
		const isValidPaginationData = checkIsValidPaginationData(
			paginationQueryData || defaultPaginationConfig,
		);

		if (paginationQuery && isValidPaginationData) return;

		redirectWithCurrentPagination(defaultPaginationConfig);
	}, [paginationQuery, paginationQueryData, redirectWithCurrentPagination]);

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
