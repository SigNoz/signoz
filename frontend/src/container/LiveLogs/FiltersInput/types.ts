import { Query } from 'types/api/queryBuilder/queryBuilderData';

export type FiltersInputProps = {
	getPreparedQuery: (query: Query) => Query;
};
