import { OPERATORS } from 'constants/queryBuilder';
import { ORDERBY_FILTERS } from 'container/QueryBuilder/filters/OrderByFilter/config';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	OrderByPayload,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

type SetupPaginationQueryDataParamsV2 = {
	page: number;
	pageSize: number;
};

type SetupPaginationQueryDataV2 = (
	params: SetupPaginationQueryDataParamsV2,
) => Partial<IBuilderQuery>;

export const getPaginationQueryDataV2: SetupPaginationQueryDataV2 = ({
	page,
	pageSize,
}) => {
	const offset = (page - 1) * pageSize;

	return {
		offset,
		pageSize,
	};
};

type SetupPaginationQueryDataParams = {
	filters: IBuilderQuery['filters'];
	listItemId: string | null;
	orderByTimestamp: OrderByPayload | null;
	page: number;
	pageSize: number;
};

type SetupPaginationQueryData = (
	params: SetupPaginationQueryDataParams,
) => Partial<IBuilderQuery>;

export const getPaginationQueryData: SetupPaginationQueryData = ({
	filters,
	listItemId,
	orderByTimestamp,
	page,
	pageSize,
}) => {
	const offset = (page - 1) * pageSize;

	const queryProps = {
		offset,
		pageSize,
	};

	const updatedFilters: TagFilter = {
		...filters,
		items: filters?.items?.filter((item) => item.key?.key !== 'id') || [],
		op: filters?.op || 'AND',
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
								type: '',
								dataType: DataTypes.String,
							},
							op:
								orderByTimestamp.order === ORDERBY_FILTERS.ASC
									? OPERATORS['>']
									: OPERATORS['<'],
							value: listItemId,
						},
						...updatedFilters.items,
				  ]
				: updatedFilters.items,
		op: filters?.op || 'AND',
	};

	const chunkOfQueryData: Partial<IBuilderQuery> = {
		filters: orderByTimestamp ? tagFilters : updatedFilters,
		...queryProps,
	};

	return chunkOfQueryData;
};
