import './HostMetricLogs.styles.scss';

import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useMemo } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { VIEWS } from '../constants';
import HostMetricsLogs from './HostMetricsLogs';

interface Props {
	timeRange: {
		startTime: number;
		endTime: number;
	};
	isModalTimeSelection: boolean;
	handleTimeChange: (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	) => void;
	handleChangeLogFilters: (value: IBuilderQuery['filters'], view: VIEWS) => void;
	logFilters: IBuilderQuery['filters'];
	selectedInterval: Time;
}

function HostMetricLogsDetailedView({
	timeRange,
	isModalTimeSelection,
	handleTimeChange,
	handleChangeLogFilters,
	logFilters,
	selectedInterval,
}: Props): JSX.Element {
	const { currentQuery } = useQueryBuilder();
	const updatedCurrentQuery = useMemo(
		() => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						dataSource: DataSource.LOGS,
						aggregateOperator: 'noop',
						aggregateAttribute: {
							...currentQuery.builder.queryData[0].aggregateAttribute,
						},
						filters: {
							items:
								logFilters?.items?.filter((item) => item.key?.key !== 'host.name') ||
								[],
							op: 'AND',
						},
					},
				],
			},
		}),
		[currentQuery, logFilters?.items],
	);

	const query = updatedCurrentQuery?.builder?.queryData[0] || null;

	return (
		<div className="host-metrics-logs-container">
			<div className="host-metrics-logs-header">
				<div className="filter-section">
					{query && (
						<QueryBuilderSearch
							query={query as IBuilderQuery}
							onChange={(value): void => handleChangeLogFilters(value, VIEWS.LOGS)}
							disableNavigationShortcuts
						/>
					)}
				</div>
				<div className="datetime-section">
					<DateTimeSelectionV2
						showAutoRefresh
						showRefreshText={false}
						hideShareModal
						isModalTimeSelection={isModalTimeSelection}
						onTimeChange={handleTimeChange}
						defaultRelativeTime="5m"
						modalSelectedInterval={selectedInterval}
					/>
				</div>
			</div>
			<HostMetricsLogs timeRange={timeRange} filters={logFilters} />
		</div>
	);
}

export default HostMetricLogsDetailedView;
