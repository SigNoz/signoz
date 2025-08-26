import './entityLogs.styles.scss';

import { VIEWS } from 'components/HostMetricsDetail/constants';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
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

import { filterOutPrimaryFilters } from '../utils';
import EntityLogs from './EntityLogs';

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
	queryKey: string;
	category: K8sCategory;
	queryKeyFilters: Array<string>;
}

function EntityLogsDetailedView({
	timeRange,
	isModalTimeSelection,
	handleTimeChange,
	handleChangeLogFilters,
	logFilters,
	selectedInterval,
	queryKey,
	category,
	queryKeyFilters,
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
							items: filterOutPrimaryFilters(logFilters?.items || [], queryKeyFilters),
							op: 'AND',
						},
					},
				],
			},
		}),
		[currentQuery, logFilters?.items, queryKeyFilters],
	);

	const query = updatedCurrentQuery?.builder?.queryData[0] || null;

	return (
		<div className="entity-logs-container">
			<div className="entity-logs-header">
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
			<EntityLogs
				timeRange={timeRange}
				filters={logFilters}
				queryKey={queryKey}
				category={category}
				queryKeyFilters={queryKeyFilters}
			/>
		</div>
	);
}

export default EntityLogsDetailedView;
