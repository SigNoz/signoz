import type { DataSource } from 'types/common/queryBuilder';

import type { BaseAutocompleteData } from './queryAutocompleteResponse';

export interface IGetAttributeValuesPayload {
	dataSource: DataSource;
	aggregateOperator: string;
	aggregateAttribute: string;
	searchText: string;
	attributeKey: string;
	filterAttributeKeyDataType: BaseAutocompleteData['dataType'];
	tagType: BaseAutocompleteData['type'];
}

export interface IAttributeValuesResponse {
	boolAttributeValues: null | string[];
	numberAttributeValues: null | string[];
	stringAttributeValues: null | string[];
}
