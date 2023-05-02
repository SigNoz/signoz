import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export type GroupByFilterProps = {
	query: IBuilderQuery;
	onChange: (values: BaseAutocompleteData[]) => void;
	disabled: boolean;
};

export type GroupByFilterValue = {
	disabled: boolean | undefined;
	key: string;
	label: string;
	title: string | undefined;
	value: string;
};
