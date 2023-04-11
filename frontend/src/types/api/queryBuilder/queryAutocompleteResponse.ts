export type LocalDataType = 'number' | 'string' | 'bool';

export type DataType = 'int64' | 'float64' | 'string' | 'bool';

export interface BaseAutocompleteData {
	dataType: DataType | null;
	isColumn: boolean | null;
	key: string;
	type: 'tag' | 'resource' | null;
}

export interface IQueryAutocompleteResponse {
	attributeKeys: BaseAutocompleteData[];
}
