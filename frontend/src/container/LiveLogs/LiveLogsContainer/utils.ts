import { OPERATORS } from 'constants/queryBuilder';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	TagFilter,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

const getIdFilter = (filtersItems: TagFilterItem[]): TagFilterItem | null =>
	filtersItems.find((item) => item.key?.key === 'id') || null;

export const prepareQueryFilter = (
	filters: TagFilter,
	tagFilter: BaseAutocompleteData,
	value: string,
): TagFilter => {
	let newItems = filters.items;

	const isExistIdFilter = getIdFilter(filters.items);

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
