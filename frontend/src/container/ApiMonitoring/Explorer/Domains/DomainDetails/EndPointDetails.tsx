import { ENTITY_VERSION_V4 } from 'constants/app';
import { initialQueriesMap } from 'constants/queryBuilder';
import {
	END_POINT_DETAILS_QUERY_KEYS_ARRAY,
	extractPortAndEndpoint,
	getEndPointDetailsQueryPayload,
	getLatencyOverTimeWidgetData,
	getRateOverTimeWidgetData,
} from 'container/ApiMonitoring/utils';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
// import {
// 	CustomTimeType,
// 	Time,
// } from 'container/TopNav/DateTimeSelectionV2/config';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useMemo, useState } from 'react';
import { useQueries } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import DependentServices from './components/DependentServices';
import EndPointMetrics from './components/EndPointMetrics';
import EndPointsDropDown from './components/EndPointsDropDown';
import MetricOverTimeGraph from './components/MetricOverTimeGraph';
import StatusCodeBarCharts from './components/StatusCodeBarCharts';
import StatusCodeTable from './components/StatusCodeTable';

function EndPointDetails({
	domainName,
	endPointName,
	setSelectedEndPointName,
	domainListFilters,
	timeRange,
}: // handleTimeChange,
{
	domainName: string;
	endPointName: string;
	setSelectedEndPointName: (value: string) => void;
	domainListFilters: IBuilderQuery['filters'];
	timeRange: {
		startTime: number;
		endTime: number;
	};
	// handleTimeChange: (
	// 	interval: Time | CustomTimeType,
	// 	dateTimeRange?: [number, number],
	// ) => void;
}): JSX.Element {
	const { startTime: minTime, endTime: maxTime } = timeRange;

	const currentQuery = initialQueriesMap[DataSource.TRACES];

	const [filters, setFilters] = useState<IBuilderQuery['filters']>({
		op: 'AND',
		items: [],
	});
	// [TODO] if endPointName is there then add it to the filters under http.url key

	// Manually update the query to include the filters
	// Because using the hook is causing the global domain
	// query to be updated and causing main domain list to
	// refetch with the filters of endpoints

	const updatedCurrentQuery = useMemo(
		() => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						dataSource: DataSource.TRACES,
						filters,
					},
				],
			},
		}),
		[filters, currentQuery],
	);

	const query = updatedCurrentQuery?.builder?.queryData[0] || null;

	const isServicesFilterApplied = useMemo(
		() => filters.items.some((item) => item.key?.key === 'service.name'),
		[filters],
	);

	const endPointDetailsQueryPayload = useMemo(
		() => getEndPointDetailsQueryPayload(domainName, minTime, maxTime, filters),
		[domainName, filters, minTime, maxTime],
	);

	const endPointDetailsDataQueries = useQueries(
		endPointDetailsQueryPayload.map((payload, index) => ({
			queryKey: [
				END_POINT_DETAILS_QUERY_KEYS_ARRAY[index],
				payload,
				filters.items,
				ENTITY_VERSION_V4,
			],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, ENTITY_VERSION_V4),
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
		() => extractPortAndEndpoint(endPointName),
		[endPointName],
	);

	const [rateOverTimeWidget, latencyOverTimeWidget] = useMemo(
		() => [
			getRateOverTimeWidgetData(domainName, endPointName, {
				items: [...domainListFilters.items, ...filters.items],
				op: filters.op,
			}),
			getLatencyOverTimeWidgetData(domainName, endPointName, {
				items: [...domainListFilters.items, ...filters.items],
				op: filters.op,
			}),
		],
		[domainName, endPointName, filters, domainListFilters],
	);

	// // [TODO] Fix this later
	// const onDragSelect = useCallback(
	// 	(start: number, end: number) => {
	// 		const startTimestamp = Math.trunc(start);
	// 		const endTimestamp = Math.trunc(end);

	// 		if (startTimestamp !== endTimestamp) {
	// 			// update the value in local time picker
	// 			handleTimeChange('custom', [startTimestamp, endTimestamp]);
	// 		}
	// 	},
	// 	[handleTimeChange],
	// );

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
				<div className="endpoint-details-filters-container-search">
					<QueryBuilderSearchV2
						query={query}
						onChange={(searchFilters): void => {
							setFilters(searchFilters);
						}}
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
				endPointName={endPointName}
				domainListFilters={domainListFilters}
				filters={filters}
				timeRange={timeRange}
			/>
			<StatusCodeTable endPointStatusCodeDataQuery={endPointStatusCodeDataQuery} />
			<MetricOverTimeGraph
				widget={rateOverTimeWidget}
				timeRange={timeRange}
				onDragSelect={(): void => {}}
			/>
			<MetricOverTimeGraph
				widget={latencyOverTimeWidget}
				timeRange={timeRange}
				onDragSelect={(): void => {}}
			/>
		</div>
	);
}

export default EndPointDetails;
