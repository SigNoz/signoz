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
	handleChangeLogFilters: (value: IBuilderQuery['filters']) => void;
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
					},
				],
			},
		}),
		[currentQuery],
	);

	const query = updatedCurrentQuery?.builder?.queryData[0] || null;

	return (
		<div className="host-metrics-logs-container">
			<div className="host-metrics-logs-header">
				<div className="filter-section">
					{query && (
						<QueryBuilderSearch
							query={query}
							onChange={handleChangeLogFilters}
							disableNavigationShortcuts
						/>
					)}
				</div>
				<div className="datetime-section">
					<DateTimeSelectionV2
						showAutoRefresh={false}
						showRefreshText={false}
						hideShareModal
						isModalTimeSelection={isModalTimeSelection}
						onTimeChange={handleTimeChange}
						defaultRelativeTime="5m"
						modalSelectedInterval={selectedInterval}
					/>
				</div>
			</div>
			<HostMetricsLogs
				timeRange={timeRange}
				handleChangeLogFilters={handleChangeLogFilters}
				filters={logFilters}
			/>
		</div>
	);
}

export default HostMetricLogsDetailedView;
