import { useCallback, useMemo } from 'react';
import { useQueries } from 'react-query';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { combineInitialAndUserExpression } from 'components/QueryBuilderV2/QueryV2/QuerySearch/utils';
import { ENTITY_VERSION_V5 } from 'constants/app';
import {
	END_POINT_DETAILS_QUERY_KEYS_ARRAY,
	extractPortAndEndpoint,
	getDomainScopeClauses,
	getEndPointDetailsQueryPayload,
	getHttpUrlExpression,
	getLatencyOverTimeWidgetData,
	getRateOverTimeWidgetData,
} from 'container/ApiMonitoring/utils';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataSource } from 'types/common/queryBuilder';
import { extractQueryPairs } from 'utils/queryContextUtils';

import DependentServices from './components/DependentServices';
import EndPointMetrics from './components/EndPointMetrics';
import EndPointPicker from './components/EndPointPicker';
import MetricOverTimeGraph from './components/MetricOverTimeGraph';
import StatusCodeBarCharts from './components/StatusCodeBarCharts';
import StatusCodeTable from './components/StatusCodeTable';
import { useFilterExpression } from './hooks/useFilterExpression';
import { useIsFetchingWidgets } from './hooks/useIsFetchingWidgets';

function EndPointDetails({
	domainName,
	endPointName,
	setSelectedEndPointName,
	timeRange,
	handleTimeChange,
}: {
	domainName: string;
	endPointName: string;
	setSelectedEndPointName: (value: string) => void;
	timeRange: {
		startTime: number;
		endTime: number;
	};
	handleTimeChange: (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	) => void;
}): JSX.Element {
	const { startTime: minTime, endTime: maxTime } = timeRange;

	// Search filters; the endpoint filter is combined in at query time
	const {
		expression: filterExpression,
		initialExpression: scopeExpression,
		queryData,
		onDraftChange,
		onRun,
		onBlur: handleFilterBlur,
	} = useFilterExpression();

	const scopeClauses = useMemo(
		() => getDomainScopeClauses(domainName, endPointName),
		[domainName, endPointName],
	);

	const httpUrlExpression = useMemo(
		() => getHttpUrlExpression(endPointName),
		[endPointName],
	);

	const scopedExpression = useMemo(
		() => combineInitialAndUserExpression(httpUrlExpression, filterExpression),
		[httpUrlExpression, filterExpression],
	);

	const isServicesFilterApplied = useMemo(
		() =>
			extractQueryPairs(filterExpression).some(
				(pair) => pair.key === 'service.name',
			),
		[filterExpression],
	);

	const endPointDetailsQueryPayload = useMemo(
		() =>
			getEndPointDetailsQueryPayload(
				domainName,
				minTime,
				maxTime,
				scopedExpression,
			),
		[domainName, scopedExpression, minTime, maxTime],
	);

	const endPointDetailsDataQueries = useQueries(
		endPointDetailsQueryPayload.map((payload, index) => ({
			queryKey: [
				END_POINT_DETAILS_QUERY_KEYS_ARRAY[index],
				payload,
				ENTITY_VERSION_V5,
			],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, ENTITY_VERSION_V5),
			enabled: !!payload,
		})),
	);

	const [
		endPointMetricsDataQuery,
		endPointStatusCodeDataQuery,
		endPointDependentServicesDataQuery,
		endPointStatusCodeBarChartsDataQuery,
		endPointStatusCodeLatencyBarChartsDataQuery,
	] = useMemo(
		() => [
			endPointDetailsDataQueries[0],
			endPointDetailsDataQueries[1],
			endPointDetailsDataQueries[2],
			endPointDetailsDataQueries[3],
			endPointDetailsDataQueries[4],
		],
		[endPointDetailsDataQueries],
	);

	const { endpoint, port } = useMemo(
		() => extractPortAndEndpoint(endPointName), // Derive display info from the prop
		[endPointName],
	);

	const [rateOverTimeWidget, latencyOverTimeWidget] = useMemo(
		() => [
			getRateOverTimeWidgetData(domainName, endPointName, scopedExpression),
			getLatencyOverTimeWidgetData(domainName, endPointName, scopedExpression),
		],
		[domainName, endPointName, scopedExpression],
	);

	const isFetchingGraphs = useIsFetchingWidgets([
		rateOverTimeWidget,
		latencyOverTimeWidget,
	]);
	const isFetchingQueries =
		isFetchingGraphs ||
		endPointDetailsDataQueries.some((query) => query.isFetching);

	// // [TODO] Fix this later
	const onDragSelect = useCallback(
		(start: number, end: number) => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			if (startTimestamp !== endTimestamp) {
				// update the value in local time picker
				handleTimeChange('custom', [startTimestamp, endTimestamp]);
			}
		},
		[handleTimeChange],
	);

	return (
		<div className="endpoint-details-container">
			<div className="endpoint-details-filters-container">
				<EndPointPicker
					domainName={domainName}
					timeRange={timeRange}
					filterExpression={filterExpression}
					value={endPointName}
					onChange={setSelectedEndPointName}
				/>
				<div onBlur={handleFilterBlur}>
					<QuerySearch
						queryData={queryData}
						onChange={onDraftChange}
						onRun={onRun}
						showRunButton
						isLoadingQueries={isFetchingQueries}
						initialExpression={scopeExpression}
						scopeClauses={scopeClauses}
						dataSource={DataSource.TRACES}
						placeholder="Search for filters..."
					/>
				</div>
			</div>
			<div className="endpoint-meta-data">
				<div className="endpoint-meta-data-pill">
					<div className="endpoint-meta-data-label">Endpoint</div>
					<div className="endpoint-meta-data-value">
						{endpoint || 'All Endpoints'}
					</div>
				</div>
				<div className="endpoint-meta-data-pill">
					<div className="endpoint-meta-data-label">Port</div>
					<div className="endpoint-meta-data-value">{port || '-'}</div>
				</div>
			</div>
			<EndPointMetrics endPointMetricsDataQuery={endPointMetricsDataQuery} />
			{!isServicesFilterApplied && (
				<DependentServices
					dependentServicesQuery={endPointDependentServicesDataQuery}
					timeRange={timeRange}
				/>
			)}
			<StatusCodeBarCharts
				endPointStatusCodeBarChartsDataQuery={endPointStatusCodeBarChartsDataQuery}
				endPointStatusCodeLatencyBarChartsDataQuery={
					endPointStatusCodeLatencyBarChartsDataQuery
				}
				domainName={domainName}
				filterExpression={scopedExpression}
				timeRange={timeRange}
				onDragSelect={onDragSelect}
			/>
			<StatusCodeTable endPointStatusCodeDataQuery={endPointStatusCodeDataQuery} />
			<MetricOverTimeGraph
				widget={rateOverTimeWidget}
				timeRange={timeRange}
				onDragSelect={onDragSelect}
			/>
			<MetricOverTimeGraph
				widget={latencyOverTimeWidget}
				timeRange={timeRange}
				onDragSelect={onDragSelect}
			/>
		</div>
	);
}

export default EndPointDetails;
