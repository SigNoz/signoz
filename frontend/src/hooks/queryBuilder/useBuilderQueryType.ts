import { useIsInQueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2Context';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import type { BuilderQueryType } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';

/**
 * The query's builder type, for picking the field suggestion endpoints. The AI query type
 * applies only inside the query builder; elsewhere, and in alert editors, which keep AI
 * queries in `builder`, the query's own tag decides.
 */
export function useBuilderQueryType(
	query: Pick<IBuilderQuery, 'builderQueryType'>,
): BuilderQueryType | undefined {
	const { currentQuery } = useQueryBuilder();
	const isInQueryBuilder = useIsInQueryBuilderV2();

	return isInQueryBuilder &&
		currentQuery?.queryType === EQueryType.AI_QUERY_BUILDER
		? 'builder_ai_query'
		: query.builderQueryType;
}
