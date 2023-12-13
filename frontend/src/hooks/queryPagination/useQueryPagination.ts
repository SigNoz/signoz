import { QueryParams } from 'constants/query';
import { ControlsProps } from 'container/Controls';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { useCallback, useEffect, useMemo } from 'react';

import { DEFAULT_PER_PAGE_OPTIONS } from './config';
import { Pagination } from './types';
import {
	checkIsValidPaginationData,
	getDefaultPaginationConfig,
} from './utils';

const useQueryPagination = (
	totalCount: number,
	perPageOptions: number[] = DEFAULT_PER_PAGE_OPTIONS,
): UseQueryPagination => {
	const defaultPaginationConfig = useMemo(
		() => getDefaultPaginationConfig(perPageOptions),
		[perPageOptions],
	);

	const {
		query: paginationQuery,
		queryData: paginationQueryData,
		redirectWithQuery: redirectWithCurrentPagination,
	} = useUrlQueryData<Pagination>(QueryParams.pagination);

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
			perPageOptions,
		);

		if (paginationQuery && isValidPaginationData) return;

		redirectWithCurrentPagination(defaultPaginationConfig);
	}, [
		defaultPaginationConfig,
		perPageOptions,
		paginationQuery,
		paginationQueryData,
		redirectWithCurrentPagination,
	]);

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
