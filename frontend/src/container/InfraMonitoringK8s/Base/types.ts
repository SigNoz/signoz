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

/**
 * Type for table row data with required key fields.
 * Used when rendering raw data in the table.
 */
export type K8sTableRowData<T> = T & {
	key: string;
	id: string;
	itemKey: string;
	/** Metadata about which attributes were used for grouping */
	groupedByMeta?: Record<string, string>;
};
