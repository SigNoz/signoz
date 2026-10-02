import { SavedviewtypesSavedViewDTO } from 'api/generated/services/sigNoz.schemas';
import { convertFiltersToExpressionWithExistingQuery } from 'components/QueryBuilderV2/utils';
import { MetricAggregation } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import { SavedViewQuerySummary } from '../types';
import { getSavedViewQuery } from './getSavedViewQuery';

export function getSavedViewQuerySummaries(
	view: SavedviewtypesSavedViewDTO,
): SavedViewQuerySummary[] {
	return getSavedViewQuery(view)
		.builder.queryData.map((query): SavedViewQuerySummary => {
			const aggregation = query.aggregations?.[0] as MetricAggregation | undefined;
			return {
				queryName: query.queryName,
				expression: convertFiltersToExpressionWithExistingQuery(
					query.filters ?? { items: [], op: 'AND' },
					query.filter?.expression,
				).filter.expression.trim(),
				metric:
					query.dataSource === DataSource.METRICS && aggregation?.metricName
						? [
								aggregation.metricName,
								aggregation.timeAggregation,
								aggregation.spaceAggregation,
							]
								.filter(Boolean)
								.join(' · ')
						: undefined,
			};
		})
		.filter(({ expression, metric }) => expression.length > 0 || !!metric);
}
