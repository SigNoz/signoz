import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { BuilderQueryType } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';

/**
 * The query's builder type, for picking the field suggestion endpoints. Alert editors
 * keep AI queries in `builder`, so a query's own tag still counts.
 */
export function useBuilderQueryType(
	query: Pick<IBuilderQuery, 'builderQueryType'>,
): BuilderQueryType | undefined {
	const { currentQuery } = useQueryBuilder();

	return currentQuery?.queryType === EQueryType.AI_QUERY_BUILDER
		? 'builder_ai_query'
		: query.builderQueryType;
}
