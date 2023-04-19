import {
	Having,
	IBuilderQueryForm,
} from 'types/api/queryBuilder/queryBuilderData';

export type HavingFilterProps = {
	query: IBuilderQueryForm;
	onChange: (having: Having[]) => void;
};
