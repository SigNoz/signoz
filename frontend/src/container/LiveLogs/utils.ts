import { OPERATORS } from 'constants/queryBuilder';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	Query,
	TagFilter,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

const getIdFilter = (filtersItems: TagFilterItem[]): TagFilterItem | null =>
	filtersItems.find((item) => item.key?.key === 'id') || null;

const getFilter = (
	filters: TagFilter,
	tagFilter: BaseAutocompleteData,
	value: string,
): TagFilter => {
	let newItems = filters.items;

	const isExistIdFilter = getIdFilter(newItems);

	if (isExistIdFilter) {
		newItems = newItems.map((item) =>
			item.key?.key === 'id' ? { ...item, value } : item,
		);
	} else {
		newItems = [
			...newItems,
			{ value, key: tagFilter, op: OPERATORS['>'], id: uuid() },
		];
	}

	return { items: newItems, op: filters.op };
};

export const prepareQueryByFilter = (
	query: Query,
	tagFilter: BaseAutocompleteData,
	value: string | null,
): Query => {
	const preparedQuery: Query = {
		...query,
		builder: {
			...query.builder,
			queryData: query.builder.queryData?.map((item) => ({
				...item,
				filters: value ? getFilter(item.filters, tagFilter, value) : item.filters,
			})),
		},
	};

	return preparedQuery;
};

export const getQueryWithoutFilterId = (query: Query): Query => {
	const preparedQuery: Query = {
		...query,
		builder: {
			...query.builder,
			queryData: query.builder.queryData?.map((item) => ({
				...item,
				filters: {
					...item.filters,
					items: item.filters.items.filter((item) => item.key?.key !== 'id'),
				},
			})),
		},
	};

	return preparedQuery;
};
