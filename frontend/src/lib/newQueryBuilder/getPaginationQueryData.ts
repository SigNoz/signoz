import { initialFilters } from 'constants/queryBuilder';
import { FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import {
	IBuilderQuery,
	OrderByPayload,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

type SetupPaginationQueryDataParams = {
	currentStagedQueryData: IBuilderQuery | null;
	listItemId: string | null;
	orderByTimestamp: OrderByPayload | null;
	page: number;
	pageSize: number;
};

type SetupPaginationQueryData = (
	params: SetupPaginationQueryDataParams,
) => Pick<IBuilderQuery, 'filters' | 'offset'>;

export const getPaginationQueryData: SetupPaginationQueryData = ({
	currentStagedQueryData,
	listItemId,
	orderByTimestamp,
	page,
	pageSize,
}) => {
	if (!currentStagedQueryData) {
		return { limit: null, filters: initialFilters };
	}

	const filters = currentStagedQueryData.filters || initialFilters;
	const offset = (page - 1) * pageSize;

	const queryProps =
		(orderByTimestamp && currentStagedQueryData.orderBy.length > 1) ||
		!orderByTimestamp
			? {
					offset,
			  }
			: {};

	const updatedFilters: TagFilter = {
		...filters,
		items: filters.items.filter((item) => item.key?.key !== 'id'),
	};

	const tagFilters: TagFilter = {
		...filters,
		items:
			listItemId && orderByTimestamp
				? [
						{
							id: uuid(),
							key: {
								key: 'id',
								type: null,
								dataType: 'string',
								isColumn: true,
							},
							op: orderByTimestamp.order === FILTERS.ASC ? '>' : '<',
							value: listItemId,
						},
						...updatedFilters.items,
				  ]
				: updatedFilters.items,
	};

	const chunkOfQueryData: Partial<IBuilderQuery> = {
		filters: orderByTimestamp ? tagFilters : updatedFilters,
		...queryProps,
	};

	return { ...currentStagedQueryData, ...chunkOfQueryData };
};
