import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

import { OrderBySchemaType } from '../schemas';

export type K8sBaseFilters = {
	filters: TagFilter;
	groupBy?: BaseAutocompleteData[];
	offset?: number;
	limit?: number;
	start: number;
	end: number;
	orderBy?: OrderBySchemaType;
};

export type K8sRenderedRowData = {
	/**
	 * The unique ID for the row
	 */
	key: string;
	/**
	 * The ID to the selectedItem
	 */
	itemKey: string;
	groupedByMeta: Record<string, string>;
	[key: string]: unknown;
};
