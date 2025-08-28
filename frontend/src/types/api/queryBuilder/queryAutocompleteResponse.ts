export enum DataTypes {
	Int64 = 'int64',
	String = 'string',
	Float64 = 'float64',
	bool = 'bool',
	ArrayFloat64 = 'array(float64)',
	ArrayInt64 = 'array(int64)',
	ArrayString = 'array(string)',
	ArrayBool = 'array(bool)',
	EMPTY = '',
}

export type LocalDataType = 'number' | 'string' | 'bool';

export type AutocompleteType = 'tag' | 'resource' | '';

export interface BaseAutocompleteData {
	id?: string;
	dataType?: DataTypes;
	key: string;
	type: AutocompleteType | string | null;
	isIndexed?: boolean;
}

export interface IQueryAutocompleteResponse {
	attributeKeys: BaseAutocompleteData[] | null;
}
