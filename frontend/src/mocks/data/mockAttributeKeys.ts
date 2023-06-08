import { IQueryAutocompleteResponse } from 'types/api/queryBuilder/queryAutocompleteResponse';

export const mockAttributeKeys: { data: IQueryAutocompleteResponse } = {
	data: {
		attributeKeys: [
			{ key: 'testKey1', isColumn: true, type: 'tag', dataType: 'bool' },
			{ key: 'testKey2', isColumn: false, type: 'resource', dataType: 'float64' },
			{ key: 'testKey3', isColumn: true, type: 'tag', dataType: 'bool' },
			{ key: 'testKey4', isColumn: false, type: 'resource', dataType: 'string' },
		],
	},
};
