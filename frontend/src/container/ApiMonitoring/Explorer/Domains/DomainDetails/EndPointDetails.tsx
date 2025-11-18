import { ENTITY_VERSION_V4, ENTITY_VERSION_V5 } from 'constants/app';
import { initialQueriesMap } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useApiMonitoringParams } from 'container/ApiMonitoring/queryParams';
import {
	END_POINT_DETAILS_QUERY_KEYS_ARRAY,
	extractPortAndEndpoint,
	getEndPointDetailsQueryPayload,
	getLatencyOverTimeWidgetData,
	getRateOverTimeWidgetData,
} from 'container/ApiMonitoring/utils';
import QueryBuilderSearchV2 from 'container/QueryBuilder/filters/QueryBuilderSearchV2/QueryBuilderSearchV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueries } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import DependentServices from './components/DependentServices';
import EndPointMetrics from './components/EndPointMetrics';
import EndPointsDropDown from './components/EndPointsDropDown';
import MetricOverTimeGraph from './components/MetricOverTimeGraph';
import StatusCodeBarCharts from './components/StatusCodeBarCharts';
import StatusCodeTable from './components/StatusCodeTable';
import { SPAN_ATTRIBUTES } from './constants';

const httpUrlKey = {
	dataType: DataTypes.String,
	key: SPAN_ATTRIBUTES.URL_PATH,
	type: 'tag',
};

function EndPointDetails({
	domainName,
	endPointName,
	setSelectedEndPointName,
	initialFilters,
	timeRange,
	handleTimeChange,
}: {
	domainName: string;
	endPointName: string;
	setSelectedEndPointName: (value: string) => void;
	initialFilters: IBuilderQuery['filters'];
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

	const currentQuery = initialQueriesMap[DataSource.TRACES];

	// Local state for filters, combining endpoint filter and search filters
	const [filters, setFilters] = useState<IBuilderQuery['filters']>(() => {
		// Initialize filters based on the initial endPointName prop
		const initialItems = params.endPointDetailsLocalFilters
			? [...(params.endPointDetailsLocalFilters?.items || [])]
			: [...(initialFilters?.items || [])];
		if (endPointName) {
			initialItems.push({
				id: '92b8a1c1',
				key: httpUrlKey,
				op: '=',
				value: endPointName,
			});
		}
		return { op: 'AND', items: initialItems };
	});

	// Effect to synchronize local filters when the endPointName prop changes (e.g., from dropdown)
	useEffect(() => {
		setFilters((currentFilters) => {
			const existingHttpUrlFilter = currentFilters?.items?.find(
				(item) => item.key?.key === httpUrlKey.key,
			);
			const existingHttpUrlValue = (existingHttpUrlFilter?.value as string) || '';

			// Only update filters if the prop value is different from what's already in filters
			if (endPointName === existingHttpUrlValue) {
				return currentFilters; // No change needed, prevents loop
			}

			// Rebuild filters: Keep non-http.url filters and add/update http.url filter based on prop
			const otherFilters = currentFilters?.items?.filter(
				(item) => item.key?.key !== httpUrlKey.key,
			);
			const newItems = [...(otherFilters || [])];
			if (endPointName) {
				newItems.push({
					id: '92b8a1c1',
					key: httpUrlKey,
					op: '=',
					value: endPointName,
				});
			}
			return { op: 'AND', items: newItems };
		});
	}, [endPointName]);

	// Separate effect to update params when filters change
	useEffect(() => {
		const filtersWithoutHttpUrl = {
			op: 'AND',
			items:
				filters?.items?.filter((item) => item.key?.key !== httpUrlKey.key) || [],
		};
		setParams({ endPointDetailsLocalFilters: filtersWithoutHttpUrl });
	}, [filters, setParams]);

	// Handler for changes from the QueryBuilderSearchV2 component
	const handleFilterChange = useCallback(
		(newFilters: IBuilderQuery['filters']): void => {
			// 1. Update local filters state immediately
			setFilters(newFilters);
			// Filter out http.url filter before saving to params
			const filteredNewFilters = {
				op: 'AND',
				items:
					newFilters?.items?.filter((item) => item.key?.key !== httpUrlKey.key) ||
					[],
			};
			setParams({ endPointDetailsLocalFilters: filteredNewFilters });

			// 2. Derive the endpoint name from the *new* filters state
			const httpUrlFilter = newFilters?.items?.find(
				(item) => item.key?.key === httpUrlKey.key,
			);
			const derivedEndPointName = (httpUrlFilter?.value as string) || '';

			// 3. If the derived endpoint name is different from the current prop,
			//    it means the search change modified the effective endpoint.
			//    Notify the parent component.
			if (derivedEndPointName !== endPointName) {
				setSelectedEndPointName(derivedEndPointName);
			}
		},
		[endPointName, setSelectedEndPointName, setParams], // Dependencies for the callback
	);

	const updatedCurrentQuery = useMemo(
		() => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
						dataSource: DataSource.TRACES,
						filters, // Use the local filters state
					},
				],
			},
		}),
		[filters, currentQuery],
	);

	const query = updatedCurrentQuery?.builder?.queryData[0] || null;

	const isServicesFilterApplied = useMemo(
		() => filters?.items?.some((item) => item.key?.key === 'service.name'),
		[filters],
	);

	const endPointDetailsQueryPayload = useMemo(
		() => getEndPointDetailsQueryPayload(domainName, minTime, maxTime, filters),
		[domainName, filters, minTime, maxTime],
	);

	const V5_QUERIES = [
		REACT_QUERY_KEY.GET_ENDPOINT_STATUS_CODE_DATA,
		REACT_QUERY_KEY.GET_ENDPOINT_STATUS_CODE_BAR_CHARTS_DATA,
		REACT_QUERY_KEY.GET_ENDPOINT_STATUS_CODE_LATENCY_BAR_CHARTS_DATA,
		REACT_QUERY_KEY.GET_ENDPOINT_METRICS_DATA,
		REACT_QUERY_KEY.GET_ENDPOINT_DEPENDENT_SERVICES_DATA,
		REACT_QUERY_KEY.GET_ENDPOINT_DROPDOWN_DATA,
	] as const;

	const endPointDetailsDataQueries = useQueries(
		endPointDetailsQueryPayload.map((payload, index) => {
			const queryKey = END_POINT_DETAILS_QUERY_KEYS_ARRAY[index];
			const version = (V5_QUERIES as readonly string[]).includes(queryKey)
				? ENTITY_VERSION_V5
				: ENTITY_VERSION_V4;
			return {
				queryKey: [
					END_POINT_DETAILS_QUERY_KEYS_ARRAY[index],
					payload,
					...(filters?.items?.length ? filters.items : []), // Include filters.items in queryKey for better caching
					version,
				],
				queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
					GetMetricQueryRange(payload, version),
				enabled: !!payload,
			};
		}),
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
			getRateOverTimeWidgetData(domainName, endPointName, filters),
			getLatencyOverTimeWidgetData(domainName, endPointName, filters),
		],
		[domainName, endPointName, filters], // Use combinedFilters
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
				<div className="endpoint-details-filters-container-search">
					<QueryBuilderSearchV2
						query={query}
						onChange={handleFilterChange}
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
				filters={filters}
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
