import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export type GroupByFilterProps = {
	query: IBuilderQuery;
	onChange: (values: BaseAutocompleteData[]) => void;
	disabled: boolean;
};
