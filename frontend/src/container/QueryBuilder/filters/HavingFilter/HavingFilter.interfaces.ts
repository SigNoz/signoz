import { Having, IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export type HavingFilterProps = {
	query: IBuilderQuery;
	onChange: (having: Having[]) => void;
};
