export interface BaseAutocompleteData {
	dataType: 'number' | 'string' | 'boolean' | null;
	isColumn: boolean | null;
	key: string;
	type: 'tag' | 'resource' | null;
}

export interface IQueryAutocompleteResponse {
	attributeKeys: BaseAutocompleteData[];
}
