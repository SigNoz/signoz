import { getPaginationQueryData } from 'lib/newQueryBuilder/getPaginationQueryData';
import { OrderByPayload, Query } from 'types/api/queryBuilder/queryBuilderData';

import { INITIAL_PAGE_SIZE } from './configs';

type GetRequestDataProps = {
	query: Query | null;
	orderByTimestamp: OrderByPayload;
	page: number;
	pageSize?: number;
};

export const getRequestData = ({
	query,
	orderByTimestamp,
	page,
	pageSize = INITIAL_PAGE_SIZE,
}: GetRequestDataProps): Query | null => {
	if (!query) return null;

	const paginateData = getPaginationQueryData({
		page,
		pageSize,
	});

	const data: Query = {
		...query,
		builder: {
			...query.builder,
			queryData: query.builder.queryData?.map((item) => ({
				...item,
				...paginateData,
				pageSize,
				orderBy: [orderByTimestamp],
			})),
		},
	};

	return data;
};
