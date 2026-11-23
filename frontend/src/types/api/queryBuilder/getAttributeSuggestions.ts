import type { DataSource } from 'types/common/queryBuilder';

import type { BaseAutocompleteData } from './queryAutocompleteResponse';
import type { TagFilter } from './queryBuilderData';

export interface IGetAttributeSuggestionsPayload {
	dataSource: DataSource;
	searchText: string;
	filters: TagFilter;
}

export interface IGetAttributeSuggestionsSuccessResponse {
	attributes: BaseAutocompleteData[];
	example_queries: TagFilter[];
}
