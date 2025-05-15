import './Summary.styles.scss';

import * as Sentry from '@sentry/react';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { usePageSize } from 'container/InfraMonitoringK8s/utils';
import { useGetMetricsList } from 'hooks/metricsExplorer/useGetMetricsList';
import { useGetMetricsTreeMap } from 'hooks/metricsExplorer/useGetMetricsTreeMap';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { AppState } from 'store/reducers';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import InspectModal from '../Inspect';
import MetricDetails from '../MetricDetails';
import {
	COMPOSITE_QUERY_KEY,
	IS_INSPECT_MODAL_OPEN_KEY,
	IS_METRIC_DETAILS_OPEN_KEY,
	SELECTED_METRIC_NAME_KEY,
} from './constants';
import MetricsSearch from './MetricsSearch';
import MetricsTable from './MetricsTable';
import MetricsTreemap from './MetricsTreemap';
import { OrderByPayload, TreemapViewType } from './types';
import {
	convertNanoToMilliseconds,
	formatDataForMetricsTable,
	getMetricsListQuery,
} from './utils';

const DEFAULT_ORDER_BY: OrderByPayload = {
	columnName: 'samples',
	order: 'desc',
};

function Summary(): JSX.Element {
	const { pageSize, setPageSize } = usePageSize('metricsExplorer');
	const [currentPage, setCurrentPage] = useState(1);
	const [orderBy, setOrderBy] = useState<OrderByPayload>(DEFAULT_ORDER_BY);
	const [heatmapView, setHeatmapView] = useState<TreemapViewType>(
		TreemapViewType.TIMESERIES,
	);

	const [searchParams, setSearchParams] = useSearchParams();
	const [isMetricDetailsOpen, setIsMetricDetailsOpen] = useState(
		() => searchParams.get(IS_METRIC_DETAILS_OPEN_KEY) === 'true' || false,
	);
	const [isInspectModalOpen, setIsInspectModalOpen] = useState(
		() => searchParams.get(IS_INSPECT_MODAL_OPEN_KEY) === 'true' || false,
	);
	const [selectedMetricName, setSelectedMetricName] = useState(
		() => searchParams.get(SELECTED_METRIC_NAME_KEY) || null,
	);

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { currentQuery, updateAllQueriesOperators } = useQueryBuilder();

	const defaultQuery = useMemo(() => {
		const query = updateAllQueriesOperators(
			initialQueriesMap.metrics,
			PANEL_TYPES.LIST,
			DataSource.METRICS,
		);

		return {
			...query,
			builder: {
				...query.builder,
				queryData: [
					{
						...query.builder.queryData[0],
						orderBy: [DEFAULT_ORDER_BY],
					},
				],
			},
		};
	}, [updateAllQueriesOperators]);

	useShareBuilderUrl(defaultQuery);

	// This is used to avoid the filters from being serialized with the id
	const currentQueryFiltersString = useMemo(() => {
		const filters = currentQuery?.builder?.queryData[0]?.filters;
		if (!filters) return '';
		const filtersWithoutId = {
			...filters,
			items: filters.items.map(({ id, ...rest }) => rest),
		};
		return JSON.stringify(filtersWithoutId);
	}, [currentQuery]);

	const queryFilters = useMemo(
		() =>
			currentQuery?.builder?.queryData[0]?.filters || {
				items: [],
				op: 'and',
			},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[currentQueryFiltersString],
	);

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		entityVersion: '',
	});

	const metricsListQuery = useMemo(() => {
		const baseQuery = getMetricsListQuery();
		return {
			...baseQuery,
			limit: pageSize,
			offset: (currentPage - 1) * pageSize,
			filters: queryFilters,
			start: convertNanoToMilliseconds(minTime),
			end: convertNanoToMilliseconds(maxTime),
			orderBy,
		};
	}, [queryFilters, minTime, maxTime, orderBy, pageSize, currentPage]);

	const metricsTreemapQuery = useMemo(
		() => ({
			limit: 100,
			filters: queryFilters,
			treemap: heatmapView,
			start: convertNanoToMilliseconds(minTime),
			end: convertNanoToMilliseconds(maxTime),
		}),
		[queryFilters, heatmapView, minTime, maxTime],
	);

	const {
		data: metricsData,
		isLoading: isMetricsLoading,
		isFetching: isMetricsFetching,
		isError: isMetricsError,
	} = useGetMetricsList(metricsListQuery, {
		enabled: !!metricsListQuery && !isInspectModalOpen,
	});

	const isListViewError = useMemo(
		() => isMetricsError || !!(metricsData && metricsData.statusCode !== 200),
		[isMetricsError, metricsData],
	);

	const {
		data: treeMapData,
		isLoading: isTreeMapLoading,
		isFetching: isTreeMapFetching,
		isError: isTreeMapError,
	} = useGetMetricsTreeMap(metricsTreemapQuery, {
		enabled: !!metricsTreemapQuery && !isInspectModalOpen,
	});

	const isProportionViewError = useMemo(
		() => isTreeMapError || treeMapData?.statusCode !== 200,
		[isTreeMapError, treeMapData],
	);

	const handleFilterChange = useCallback(
		(value: TagFilter) => {
			handleChangeQueryData('filters', value);
			const compositeQuery = {
				...currentQuery,
				builder: {
					...currentQuery.builder,
					queryData: [
						{
							...currentQuery.builder.queryData[0],
							filters: value,
						},
					],
				},
			};
			setSearchParams({
				[COMPOSITE_QUERY_KEY]: JSON.stringify(compositeQuery),
			});
			setCurrentPage(1);
		},
		[handleChangeQueryData, currentQuery, setSearchParams],
	);

	const updatedCurrentQuery = useMemo(
		() => ({
			...currentQuery,
			builder: {
				...currentQuery.builder,
				queryData: [
					{
						...currentQuery.builder.queryData[0],
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

	const searchQuery = updatedCurrentQuery?.builder?.queryData[0] || null;

	const onPaginationChange = (page: number, pageSize: number): void => {
		setCurrentPage(page);
		setPageSize(pageSize);
	};

	const formattedMetricsData = useMemo(
		() => formatDataForMetricsTable(metricsData?.payload?.data?.metrics || []),
		[metricsData],
	);

	const openMetricDetails = (metricName: string): void => {
		setSelectedMetricName(metricName);
		setIsMetricDetailsOpen(true);
		setSearchParams({
			[IS_METRIC_DETAILS_OPEN_KEY]: 'true',
			[SELECTED_METRIC_NAME_KEY]: metricName,
		});
	};

	const closeMetricDetails = (): void => {
		setSelectedMetricName(null);
		setIsMetricDetailsOpen(false);
		setSearchParams({
			[IS_METRIC_DETAILS_OPEN_KEY]: 'false',
			[SELECTED_METRIC_NAME_KEY]: '',
		});
	};

	const openInspectModal = (metricName: string): void => {
		setSelectedMetricName(metricName);
		setIsInspectModalOpen(true);
		setIsMetricDetailsOpen(false);
		setSearchParams({
			[IS_INSPECT_MODAL_OPEN_KEY]: 'true',
			[SELECTED_METRIC_NAME_KEY]: metricName,
		});
	};

	const closeInspectModal = (): void => {
		handleChangeQueryData('filters', {
			items: [],
			op: 'AND',
		});
		setIsInspectModalOpen(false);
		setSelectedMetricName(null);
		setSearchParams({
			[IS_INSPECT_MODAL_OPEN_KEY]: 'false',
			[SELECTED_METRIC_NAME_KEY]: '',
		});
	};

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="metrics-explorer-summary-tab">
				<MetricsSearch query={searchQuery} onChange={handleFilterChange} />
				<MetricsTreemap
					data={treeMapData?.payload}
					isLoading={isTreeMapLoading || isTreeMapFetching}
					isError={isProportionViewError}
					viewType={heatmapView}
					openMetricDetails={openMetricDetails}
					setHeatmapView={setHeatmapView}
				/>
				<MetricsTable
					isLoading={isMetricsLoading || isMetricsFetching}
					isError={isListViewError}
					data={formattedMetricsData}
					pageSize={pageSize}
					currentPage={currentPage}
					onPaginationChange={onPaginationChange}
					setOrderBy={setOrderBy}
					totalCount={metricsData?.payload?.data?.total || 0}
					openMetricDetails={openMetricDetails}
				/>
			</div>
			{isMetricDetailsOpen && (
				<MetricDetails
					isOpen={isMetricDetailsOpen}
					onClose={closeMetricDetails}
					metricName={selectedMetricName}
					isModalTimeSelection={false}
					openInspectModal={openInspectModal}
				/>
			)}
			{isInspectModalOpen && (
				<InspectModal
					isOpen={isInspectModalOpen}
					onClose={closeInspectModal}
					metricName={selectedMetricName}
				/>
			)}
		</Sentry.ErrorBoundary>
	);
}

export default Summary;
