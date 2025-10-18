import { AutoCompleteProps } from 'antd';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export type AgregatorFilterProps = Pick<AutoCompleteProps, 'disabled'> & {
	query: IBuilderQuery;
	onChange: (value: BaseAutocompleteData, isEditMode?: boolean) => void;
	defaultValue?: string;
	onSelect?: (value: BaseAutocompleteData) => void;
	index?: number;
	signalSource?: 'meter' | '';
	setAttributeKeys?: (keys: BaseAutocompleteData[]) => void;
};
