import { AutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';

export type AgregatorFilterProps = {
	onChange: (value: AutocompleteData) => void;
	query: IBuilderQueryForm;
};
