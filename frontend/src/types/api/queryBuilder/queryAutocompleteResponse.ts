export type LocalDataType = 'number' | 'string' | 'bool';

export type DataType = 'int64' | 'float64' | 'string' | 'bool';

export type AutocompleteType = 'tag' | 'resource';

export interface BaseAutocompleteData {
	id?: string;
	dataType: DataType | null;
	isColumn: boolean | null;
	key: string;
	type: AutocompleteType | null;
}

export interface IQueryAutocompleteResponse {
	attributeKeys: BaseAutocompleteData[] | null;
}
