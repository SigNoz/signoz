import { AutocompleteDataLabeled } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';

export type AgregatorFilterProps = {
	onChange: (value: AutocompleteDataLabeled) => void;
	query: IBuilderQueryForm;
};
