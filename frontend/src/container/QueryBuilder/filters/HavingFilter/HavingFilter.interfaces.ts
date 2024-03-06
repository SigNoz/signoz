import { Having, IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export type HavingFilterProps = {
	entityVersion: string;
	query: IBuilderQuery;
	onChange: (having: Having[]) => void;
};
