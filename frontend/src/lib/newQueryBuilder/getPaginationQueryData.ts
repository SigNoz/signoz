import { initialFilters } from 'constants/queryBuilder';
import {
	IBuilderQuery,
	Query,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

type SetupPaginationQueryDataParams = {
	query: Query;
	listItemId: string | null;
	isTimeStampPresent: boolean;
	page: number;
	pageSize: number;
};

type SetupPaginationQueryData = (
	params: SetupPaginationQueryDataParams,
) => Pick<IBuilderQuery, 'filters' | 'orderBy' | 'limit' | 'offset'>;

export const getPaginationQueryData: SetupPaginationQueryData = ({
	query,
	listItemId,
	isTimeStampPresent,
	page,
	pageSize,
}) => {
	if (
		query.builder.queryData.length === 0 ||
		query.builder.queryData.length > 1
	) {
		return { limit: 100, filters: initialFilters, orderBy: [] };
	}

	const queryData = query.builder.queryData[0];

	const orderBy = queryData.orderBy || [];
	const filters = queryData.filters || initialFilters;
	const limit = queryData.limit || 100;
	const offset = (page - 1) * pageSize + 1;

	const queryProps =
		(isTimeStampPresent && queryData.orderBy.length > 1) || !isTimeStampPresent
			? {
					offset,
					limit,
			  }
			: { limit };

	const updatedFilters: TagFilter = {
		...filters,
		items: filters.items.filter((item) => item.key?.key !== 'id'),
	};

	const tagFilters: TagFilter = {
		...filters,
		items: listItemId
			? [
					{
						id: uuid(),
						key: {
							key: 'id',
							type: null,
							dataType: 'string',
							isColumn: true,
						},
						op: '>',
						value: listItemId,
					},
					...updatedFilters.items,
			  ]
			: updatedFilters.items,
	};

	const chunkOfQueryData: Partial<IBuilderQuery> = {
		filters: isTimeStampPresent ? tagFilters : updatedFilters,
		orderBy,
		...queryProps,
	};

	return { ...queryData, ...chunkOfQueryData };
};
