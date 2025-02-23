import { initialFilters } from 'constants/queryBuilder';
import { getPaginationQueryData } from 'lib/newQueryBuilder/getPaginationQueryData';
import { ILog } from 'types/api/logs/log';
import {
	IBuilderQuery,
	OrderByPayload,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';

import { INITIAL_PAGE_SIZE } from './configs';

type GetRequestDataProps = {
	query: Query | null;
	stagedQueryData: IBuilderQuery | null;
	log: ILog;
	orderByTimestamp: OrderByPayload;
	page: number;
	pageSize?: number;
};

export const getRequestData = ({
	query,
	stagedQueryData,
	log,
	orderByTimestamp,
	page,
	pageSize = INITIAL_PAGE_SIZE,
}: GetRequestDataProps): Query | null => {
	if (!query) return null;

	const paginateData = getPaginationQueryData({
		filters: stagedQueryData?.filters || initialFilters,
		listItemId: log ? log.id : null,
		orderByTimestamp,
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
