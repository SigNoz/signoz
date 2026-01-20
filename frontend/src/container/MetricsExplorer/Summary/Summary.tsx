/* eslint-disable no-nested-ternary */
import './Summary.styles.scss';

import * as Sentry from '@sentry/react';
import logEvent from 'api/common/logEvent';
import { initialQueriesMap } from 'constants/queryBuilder';
import { usePageSize } from 'container/InfraMonitoringK8s/utils';
import NoLogs from 'container/NoLogs/NoLogs';
import { useGetMetricsList } from 'hooks/metricsExplorer/useGetMetricsList';
import { useGetMetricsTreeMap } from 'hooks/metricsExplorer/useGetMetricsTreeMap';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { AppState } from 'store/reducers';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import { MetricsExplorerEventKeys, MetricsExplorerEvents } from '../events';
import InspectModal from '../Inspect';
import MetricDetails from '../MetricDetails';
import { MetricsLoading } from '../MetricsLoading/MetricsLoading';
import {
	IS_INSPECT_MODAL_OPEN_KEY,
	IS_METRIC_DETAILS_OPEN_KEY,
	SELECTED_METRIC_NAME_KEY,
	SUMMARY_FILTERS_KEY,
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

	const queryFilters: TagFilter = useMemo(() => {
		const encodedFilters = searchParams.get(SUMMARY_FILTERS_KEY);
		if (encodedFilters) {
			return JSON.parse(encodedFilters);
		}
		return {
			items: [],
			op: 'AND',
		};
	}, [searchParams]);

	useEffect(() => {
		logEvent(MetricsExplorerEvents.TabChanged, {
			[MetricsExplorerEventKeys.Tab]: 'summary',
			[MetricsExplorerEventKeys.TimeRange]: {
				startTime: convertNanoToMilliseconds(minTime),
				endTime: convertNanoToMilliseconds(maxTime),
			},
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// This is used to avoid the filters from being serialized with the id
	const queryFiltersWithoutId = useMemo(() => {
		const filtersWithoutId = {
			...queryFilters,
			items: queryFilters.items.map(({ id, ...rest }) => rest),
		};
		return JSON.stringify(filtersWithoutId);
	}, [queryFilters]);

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
		queryKey: [
			'metricsList',
			queryFiltersWithoutId,
			orderBy,
			pageSize,
			currentPage,
			minTime,
			maxTime,
		],
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
		queryKey: [
			'metricsTreemap',
			queryFiltersWithoutId,
			heatmapView,
			minTime,
			maxTime,
		],
	});

	const isProportionViewError = useMemo(
		() => isTreeMapError || treeMapData?.statusCode !== 200,
		[isTreeMapError, treeMapData],
	);

	const handleFilterChange = useCallback(
		(value: TagFilter) => {
			setSearchParams({
				...Object.fromEntries(searchParams.entries()),
				[SUMMARY_FILTERS_KEY]: JSON.stringify(value),
			});
			setCurrentPage(1);
			if (value.items.length > 0) {
				logEvent(MetricsExplorerEvents.FilterApplied, {
					[MetricsExplorerEventKeys.Tab]: 'summary',
				});
			}
		},
		[setSearchParams, searchParams],
	);

	const searchQuery = useMemo(
		() => ({
			...initialQueriesMap.metrics.builder.queryData[0],
			filters: queryFilters,
		}),
		[queryFilters],
	);

	const onPaginationChange = (page: number, pageSize: number): void => {
		setCurrentPage(page);
		setPageSize(pageSize);
		logEvent(MetricsExplorerEvents.PageNumberChanged, {
			[MetricsExplorerEventKeys.Tab]: 'summary',
			[MetricsExplorerEventKeys.PageNumber]: page,
		});
		logEvent(MetricsExplorerEvents.PageSizeChanged, {
			[MetricsExplorerEventKeys.Tab]: 'summary',
			[MetricsExplorerEventKeys.PageSize]: pageSize,
		});
	};

	const formattedMetricsData = useMemo(
		() => formatDataForMetricsTable(metricsData?.payload?.data?.metrics || []),
		[metricsData],
	);

	const openMetricDetails = (
		metricName: string,
		view: 'list' | 'treemap',
	): void => {
		setSelectedMetricName(metricName);
		setIsMetricDetailsOpen(true);
		setSearchParams({
			...Object.fromEntries(searchParams.entries()),
			[IS_METRIC_DETAILS_OPEN_KEY]: 'true',
			[SELECTED_METRIC_NAME_KEY]: metricName,
		});
		logEvent(MetricsExplorerEvents.MetricClicked, {
			[MetricsExplorerEventKeys.MetricName]: metricName,
			[MetricsExplorerEventKeys.View]: view,
		});
	};

	const closeMetricDetails = (): void => {
		setSelectedMetricName(null);
		setIsMetricDetailsOpen(false);
		setSearchParams({
			...Object.fromEntries(searchParams.entries()),
			[IS_METRIC_DETAILS_OPEN_KEY]: 'false',
			[SELECTED_METRIC_NAME_KEY]: '',
		});
	};

	const openInspectModal = (metricName: string): void => {
		setSelectedMetricName(metricName);
		setIsInspectModalOpen(true);
		setIsMetricDetailsOpen(false);
		setSearchParams({
			...Object.fromEntries(searchParams.entries()),
			[IS_INSPECT_MODAL_OPEN_KEY]: 'true',
			[SELECTED_METRIC_NAME_KEY]: metricName,
		});
	};

	const closeInspectModal = (): void => {
		setIsInspectModalOpen(false);
		setSelectedMetricName(null);
		setSearchParams({
			...Object.fromEntries(searchParams.entries()),
			[IS_INSPECT_MODAL_OPEN_KEY]: 'false',
			[SELECTED_METRIC_NAME_KEY]: '',
		});
	};

	const handleSetHeatmapView = (view: TreemapViewType): void => {
		setHeatmapView(view);
		logEvent(MetricsExplorerEvents.TreemapViewChanged, {
			[MetricsExplorerEventKeys.Tab]: 'summary',
			[MetricsExplorerEventKeys.ViewType]: view,
		});
	};

	const handleSetOrderBy = (orderBy: OrderByPayload): void => {
		setOrderBy(orderBy);
		logEvent(MetricsExplorerEvents.OrderByApplied, {
			[MetricsExplorerEventKeys.Tab]: 'summary',
			[MetricsExplorerEventKeys.ColumnName]: orderBy.columnName,
			[MetricsExplorerEventKeys.Order]: orderBy.order,
		});
	};

	const isMetricsListDataEmpty = useMemo(
		() =>
			formattedMetricsData.length === 0 && !isMetricsLoading && !isMetricsFetching,
		[formattedMetricsData, isMetricsLoading, isMetricsFetching],
	);

	const isMetricsTreeMapDataEmpty = useMemo(
		() =>
			!treeMapData?.payload?.data[heatmapView]?.length &&
			!isTreeMapLoading &&
			!isTreeMapFetching,
		[
			treeMapData?.payload?.data,
			heatmapView,
			isTreeMapLoading,
			isTreeMapFetching,
		],
	);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="metrics-explorer-summary-tab">
				<MetricsSearch query={searchQuery} onChange={handleFilterChange} />
				{isMetricsLoading || isTreeMapLoading ? (
					<MetricsLoading />
				) : isMetricsListDataEmpty && isMetricsTreeMapDataEmpty ? (
					<NoLogs dataSource={DataSource.METRICS} />
				) : (
					<>
						<MetricsTreemap
							data={treeMapData?.payload}
							isLoading={isTreeMapLoading || isTreeMapFetching}
							isError={isProportionViewError}
							viewType={heatmapView}
							openMetricDetails={openMetricDetails}
							setHeatmapView={handleSetHeatmapView}
						/>
						<MetricsTable
							isLoading={isMetricsLoading || isMetricsFetching}
							isError={isListViewError}
							data={formattedMetricsData}
							pageSize={pageSize}
							currentPage={currentPage}
							onPaginationChange={onPaginationChange}
							setOrderBy={handleSetOrderBy}
							totalCount={metricsData?.payload?.data?.total || 0}
							openMetricDetails={openMetricDetails}
							queryFilters={queryFilters}
						/>
					</>
				)}
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
