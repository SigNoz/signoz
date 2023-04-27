import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';

export type GroupByFilterProps = {
	query: IBuilderQueryForm;
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
