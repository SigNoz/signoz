import { DataSource } from 'types/common/queryBuilder';

import { BaseAutocompleteData } from './queryAutocompleteResponse';

export interface IGetAttributeValuesPayload {
	dataSource: DataSource;
	aggregateOperator: string;
	aggregateAttribute: string;
	searchText: string;
	attributeKey: string;
	attributeKeyDataType: BaseAutocompleteData['dataType'];
	filterAttributeTagType: BaseAutocompleteData['type'];
}

export interface IAttributeValuesResponse {
	boolAttributeValues: null | string[];
	numberAttributeValues: null | string[];
	stringAttributeValues: null | string[];
}
