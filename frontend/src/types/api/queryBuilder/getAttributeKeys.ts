import type { DataSource } from 'types/common/queryBuilder';

import type { BaseAutocompleteData } from './queryAutocompleteResponse';

export interface IGetAttributeKeysPayload {
	aggregateOperator: string;
	dataSource: DataSource;
	searchText: string;
	aggregateAttribute: string;
	tagType?: BaseAutocompleteData['type'];
}
