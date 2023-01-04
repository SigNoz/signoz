export type QueryType = 1 | 2 | 3;

export const QUERY_BUILDER: QueryType = 1;
export const PROMQL: QueryType = 3;

export const resolveQueryCategoryName = (s: number): string => {
	switch (s) {
		case 1:
			return 'Query Builder';
		case 2:
			return 'Clickhouse Query';
		case 3:
			return 'PromQL';
		default:
			return '';
	}
};
