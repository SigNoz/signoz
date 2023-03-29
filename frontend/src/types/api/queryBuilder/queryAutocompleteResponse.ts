export interface AutocompleteData {
	dataType: 'number' | 'string' | 'boolean' | null;
	isColumn: boolean | null;
	key: string;
	type: 'tag' | 'resource' | null;
}

export interface AutocompleteDataLabeled extends AutocompleteData {
	label: string;
}

export interface IQueryAutocompleteResponseWithLabel {
	attributeKeys: AutocompleteDataLabeled[];
}

export interface IQueryAutocompleteResponse {
	attributeKeys: AutocompleteData[];
}
