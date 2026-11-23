import type { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export type GroupByFilterProps = {
	query: IBuilderQuery;
	onChange: (values: BaseAutocompleteData[]) => void;
	disabled: boolean;
	placeholder?: string;
};
