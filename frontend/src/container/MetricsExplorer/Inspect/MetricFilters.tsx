import { useCallback } from 'react';
import { Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { convertExpressionToFilters } from 'components/QueryBuilderV2/utils';
import { DataSource } from 'types/common/queryBuilder';

import { MetricsExplorerEventKeys, MetricsExplorerEvents } from '../events';
import { MetricFiltersProps } from './types';

function MetricFilters({
	dispatchMetricInspectionOptions,
	currentQuery,
	setCurrentQuery,
}: MetricFiltersProps): JSX.Element {
	const handleOnChange = useCallback(
		(expression: string): void => {
			logEvent(MetricsExplorerEvents.FilterApplied, {
				[MetricsExplorerEventKeys.Modal]: 'inspect',
			});
			const tagFilter = {
				items: convertExpressionToFilters(expression),
				op: 'AND',
			};
			setCurrentQuery({
				...currentQuery,
				filters: tagFilter,
				filter: {
					...currentQuery.filter,
					expression,
				},
				expression,
			});
			dispatchMetricInspectionOptions({
				type: 'SET_FILTERS',
				payload: tagFilter,
			});
		},
		[currentQuery, dispatchMetricInspectionOptions, setCurrentQuery],
	);

	return (
		<div
			data-testid="metric-filters"
			className="inspect-metrics-input-group metric-filters"
		>
			<Typography.Text>Where</Typography.Text>
			<QuerySearch
				queryData={currentQuery}
				onChange={handleOnChange}
				dataSource={DataSource.METRICS}
			/>
		</div>
	);
}

export default MetricFilters;
