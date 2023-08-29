import { Query } from 'types/api/queryBuilder/queryBuilderData';

export type LiveLogsTopNavProps = {
	getPreparedQuery: (query: Query) => Query;
};
