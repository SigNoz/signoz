import { initialFilters } from 'constants/queryBuilder';
import { DEFAULT_QUERY_LIMIT } from 'container/LogsExplorerViews/constants';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

type SetupPaginationQueryDataParams = {
	currentStagedQueryData: IBuilderQuery | null;
	listItemId: string | null;
	isTimeStampPresent: boolean;
	page: number;
	pageSize: number;
};

type SetupPaginationQueryData = (
	params: SetupPaginationQueryDataParams,
) => Pick<IBuilderQuery, 'filters' | 'offset'>;

export const getPaginationQueryData: SetupPaginationQueryData = ({
	currentStagedQueryData,
	listItemId,
	isTimeStampPresent,
	page,
	pageSize,
}) => {
	if (!currentStagedQueryData) {
		return { limit: DEFAULT_QUERY_LIMIT, filters: initialFilters };
	}

	const filters = currentStagedQueryData.filters || initialFilters;
	const offset = (page - 1) * pageSize;

	const queryProps =
		(isTimeStampPresent && currentStagedQueryData.orderBy.length > 1) ||
		!isTimeStampPresent
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
		...queryProps,
	};

	return { ...currentStagedQueryData, ...chunkOfQueryData };
};
