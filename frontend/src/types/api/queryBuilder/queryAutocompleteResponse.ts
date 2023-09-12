import { DataTypes } from 'container/LogDetailedView/types';

export type LocalDataType = 'number' | 'string' | 'bool';

export type DataType = 'int64' | 'float64' | 'string' | 'bool' | '';

export type AutocompleteType = 'tag' | 'resource' | '';

export interface BaseAutocompleteData {
	id?: string;
	dataType: DataType | DataTypes;
	isColumn: boolean;
	key: string;
	type: AutocompleteType | string | null;
	isJSON?: boolean;
}

export interface IQueryAutocompleteResponse {
	attributeKeys: BaseAutocompleteData[] | null;
}
