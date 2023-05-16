import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export type AgregatorFilterProps = {
	onChange: (value: BaseAutocompleteData) => void;
	query: IBuilderQuery;
};
