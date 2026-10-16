import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueries } from 'react-query';
import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { useApiMonitoringParams } from 'container/ApiMonitoring/queryParams';
import {
	END_POINT_DETAILS_QUERY_KEYS_ARRAY,
	extractPortAndEndpoint,
	getEndPointDetailsQueryPayload,
	getHttpUrlFromExpression,
	getLatencyOverTimeWidgetData,
	getRateOverTimeWidgetData,
	removeHttpUrlFromExpression,
	setHttpUrlInExpression,
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
import EndPointsDropDown from './components/EndPointsDropDown';
import MetricOverTimeGraph from './components/MetricOverTimeGraph';
import StatusCodeBarCharts from './components/StatusCodeBarCharts';
import StatusCodeTable from './components/StatusCodeTable';
import { useFilterExpression } from './hooks/useFilterExpression';

function EndPointDetails({
	domainName,
	endPointName,
	setSelectedEndPointName,
	initialFilterExpression,
	timeRange,
	handleTimeChange,
}: {
	domainName: string;
	endPointName: string;
	setSelectedEndPointName: (value: string) => void;
	initialFilterExpression: string;
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
	const [params, setParams] = useApiMonitoringParams();

	// Local state for filters, combining endpoint filter and search filters
	const [filterExpression, setFilterExpression] = useState<string>(() =>
		setHttpUrlInExpression(
			params.endPointDetailsFilterExpression ?? initialFilterExpression,
			endPointName,
		),
	);

	// Effect to synchronize local filters when the endPointName prop changes (e.g., from dropdown)
	useEffect(() => {
		setFilterExpression((current) =>
			getHttpUrlFromExpression(current) === endPointName
				? current
				: setHttpUrlInExpression(current, endPointName),
		);
	}, [endPointName]);

	// Separate effect to update params when filters change
	useEffect(() => {
		setParams({
			endPointDetailsFilterExpression:
				removeHttpUrlFromExpression(filterExpression),
		});
	}, [filterExpression, setParams]);

	// Handler for changes from the QuerySearch component
	const handleFilterChange = useCallback(
		(expression: string): void => {
			setFilterExpression(expression);

			// The search change may have modified the effective endpoint; notify the parent.
			const derivedEndPointName = getHttpUrlFromExpression(expression);
			if (derivedEndPointName !== endPointName) {
				setSelectedEndPointName(derivedEndPointName);
			}
		},
		[endPointName, setSelectedEndPointName],
	);

	const {
		queryData,
		onDraftChange,
		onRun,
		onBlur: handleFilterBlur,
	} = useFilterExpression({
		expression: filterExpression,
		onExpressionChange: handleFilterChange,
	});

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
				filterExpression,
			),
		[domainName, filterExpression, minTime, maxTime],
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
		endPointDropDownDataQuery,
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
			endPointDetailsDataQueries[5],
		],
		[endPointDetailsDataQueries],
	);

	const { endpoint, port } = useMemo(
		() => extractPortAndEndpoint(endPointName), // Derive display info from the prop
		[endPointName],
	);

	const [rateOverTimeWidget, latencyOverTimeWidget] = useMemo(
		() => [
			getRateOverTimeWidgetData(domainName, endPointName, filterExpression),
			getLatencyOverTimeWidgetData(domainName, endPointName, filterExpression),
		],
		[domainName, endPointName, filterExpression],
	);

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
				<div className="endpoint-details-filters-container-dropdown">
					<EndPointsDropDown
						selectedEndPointName={endPointName}
						setSelectedEndPointName={setSelectedEndPointName}
						endPointDropDownDataQuery={endPointDropDownDataQuery}
						parentContainerDiv=".endpoint-details-filters-container"
						dropdownStyle={{ width: 'calc(100% - 36px)' }}
					/>
				</div>
				<div
					className="endpoint-details-filters-container-search"
					onBlur={handleFilterBlur}
				>
					<QuerySearch
						queryData={queryData}
						onChange={onDraftChange}
						onRun={onRun}
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
				filterExpression={filterExpression}
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
