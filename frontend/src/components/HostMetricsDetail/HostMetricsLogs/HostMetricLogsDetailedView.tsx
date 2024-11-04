import './HostMetricLogs.styles.scss';

import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import GetMinMax from 'lib/getMinMax';
import { memo, useCallback, useMemo, useState } from 'react';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuidv4 } from 'uuid';

import HostMetricsLogs from './HostMetricsLogs';

interface Props {
	hostName: string;
	timeRange: {
		startTime: number;
		endTime: number;
	};
	isModalTimeSelection: boolean;
}

function HostMetricLogsDetailedView({
	hostName,
	timeRange,
	isModalTimeSelection,
}: Props): JSX.Element {
	const [modalTimeRange, setModalTimeRange] = useState(timeRange);
	const [, setSelectedInterval] = useState<Time>('5m');
	const [filters, setFilters] = useState<IBuilderQuery['filters']>({
		op: 'AND',
		items: [],
	});
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

	// const { handleChangeQueryData } = useQueryOperations({
	//     index: 0,
	//     query,
	//     isListViewPanel: true,
	//     entityVersion: '',
	// });

	const handleChangeTagFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			setFilters({
				op: 'AND',
				items: [
					{
						id: uuidv4(),
						key: {
							key: 'host.name',
							dataType: DataTypes.String,
							type: 'resource',
							isColumn: false,
							isJSON: false,
							id: 'host.name--string--resource--false',
						},
						op: '=',
						value: hostName,
					},
					...value.items,
				],
			});
		},
		[hostName],
	);

	const handleTimeChange = useCallback(
		(interval: Time | CustomTimeType, dateTimeRange?: [number, number]): void => {
			setSelectedInterval(interval as Time);
			if (interval === 'custom' && dateTimeRange) {
				setModalTimeRange({
					startTime: dateTimeRange[0],
					endTime: dateTimeRange[1],
				});
			} else {
				const { maxTime, minTime } = GetMinMax(interval);
				setModalTimeRange({
					startTime: minTime / 1000000,
					endTime: maxTime / 1000000,
				});
			}
		},
		[],
	);

	return (
		<div className="host-metrics-logs-container">
			<div className="host-metrics-logs-header">
				<div className="filter-section">
					{query && (
						<QueryBuilderSearch query={query} onChange={handleChangeTagFilters} />
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
					/>
				</div>
			</div>
			<HostMetricsLogs timeRange={modalTimeRange} filters={filters} />
		</div>
	);
}

export default memo(HostMetricLogsDetailedView);
