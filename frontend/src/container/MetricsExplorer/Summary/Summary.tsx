/* eslint-disable no-nested-ternary */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom-v5-compat';
import * as Sentry from '@sentry/react';
import logEvent from 'api/common/logEvent';
import {
	useGetMetricsStats,
	useGetMetricsTreemap,
} from 'api/generated/services/metrics';
import {
	MetricsexplorertypesStatsRequestDTO,
	MetricsexplorertypesTreemapModeDTO,
	MetricsexplorertypesTreemapRequestDTO,
	Querybuildertypesv5OrderByDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	convertExpressionToFilters,
	convertFiltersToExpression,
} from 'components/QueryBuilderV2/utils';
import { usePageSize } from 'container/InfraMonitoringK8s/utils';
import NoLogs from 'container/NoLogs/NoLogs';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
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
} from './constants';
import MetricsSearch from './MetricsSearch';
import MetricsTable from './MetricsTable';
import MetricsTreemap from './MetricsTreemap';
import { convertNanoToMilliseconds, formatDataForMetricsTable } from './utils';

import './Summary.styles.scss';

const DEFAULT_ORDER_BY: Querybuildertypesv5OrderByDTO = {
	key: {
		name: 'samples',
	},
	direction: 'desc',
};

function Summary(): JSX.Element {
	const { pageSize, setPageSize } = usePageSize('metricsExplorer');
	const [currentPage, setCurrentPage] = useState(1);
	const [orderBy, setOrderBy] = useState<Querybuildertypesv5OrderByDTO>(
		DEFAULT_ORDER_BY,
	);
	const [
		heatmapView,
		setHeatmapView,
	] = useState<MetricsexplorertypesTreemapModeDTO>(
		MetricsexplorertypesTreemapModeDTO.timeseries,
	);

	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const query = useMemo(() => currentQuery?.builder?.queryData[0], [
		currentQuery,
	]);

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

	const queryFilterExpression = useMemo(() => {
		const filters = query?.filters || { items: [], op: 'AND' };
		return convertFiltersToExpression(filters);
	}, [query?.filters]);

	const metricsListQuery: MetricsexplorertypesStatsRequestDTO = useMemo(
		() => ({
			start: convertNanoToMilliseconds(minTime),
			end: convertNanoToMilliseconds(maxTime),
			limit: pageSize,
			offset: (currentPage - 1) * pageSize,
			orderBy,
			filter: queryFilterExpression,
		}),
		[minTime, maxTime, orderBy, pageSize, currentPage, queryFilterExpression],
	);

	const metricsTreemapQuery: MetricsexplorertypesTreemapRequestDTO = useMemo(
		() => ({
			limit: 100,
			treemap: heatmapView,
			start: convertNanoToMilliseconds(minTime),
			end: convertNanoToMilliseconds(maxTime),
			mode: heatmapView,
			filter: queryFilterExpression,
		}),
		[heatmapView, minTime, maxTime, queryFilterExpression],
	);

	const {
		data: metricsData,
		mutate: getMetricsStats,
		isLoading: isGetMetricsStatsLoading,
		isError: isGetMetricsStatsError,
	} = useGetMetricsStats();

	useEffect(() => {
		getMetricsStats({
			data: metricsListQuery,
		});
	}, [metricsListQuery, getMetricsStats]);

	const isListViewError = useMemo(
		() => isGetMetricsStatsError || metricsData?.status !== 200,
		[isGetMetricsStatsError, metricsData],
	);

	const {
		data: treeMapData,
		mutate: getMetricsTreemap,
		isLoading: isGetMetricsTreemapLoading,
		isError: isGetMetricsTreemapError,
	} = useGetMetricsTreemap();

	useEffect(() => {
		getMetricsTreemap({
			data: metricsTreemapQuery,
		});
	}, [metricsTreemapQuery, getMetricsTreemap]);

	const isProportionViewError = useMemo(
		() => isGetMetricsTreemapError || treeMapData?.status !== 200,
		[isGetMetricsTreemapError, treeMapData],
	);

	const handleFilterChange = useCallback(
		(expression: string) => {
			const newFilters: TagFilter = {
				items: convertExpressionToFilters(expression),
				op: 'AND',
			};
			redirectWithQueryBuilderData({
				...currentQuery,
				builder: {
					...currentQuery.builder,
					queryData: [
						{
							...currentQuery.builder.queryData[0],
							filters: newFilters,
							filter: {
								expression,
							},
						},
					],
				},
			});
			setCurrentPage(1);
			if (expression) {
				logEvent(MetricsExplorerEvents.FilterApplied, {
					[MetricsExplorerEventKeys.Tab]: 'summary',
				});
			}
		},
		[currentQuery, redirectWithQueryBuilderData],
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
		() => formatDataForMetricsTable(metricsData?.data?.data?.metrics || []),
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

	const handleSetHeatmapView = (
		view: MetricsexplorertypesTreemapModeDTO,
	): void => {
		setHeatmapView(view);
		logEvent(MetricsExplorerEvents.TreemapViewChanged, {
			[MetricsExplorerEventKeys.Tab]: 'summary',
			[MetricsExplorerEventKeys.ViewType]: view,
		});
	};

	const handleSetOrderBy = (orderBy: Querybuildertypesv5OrderByDTO): void => {
		setOrderBy(orderBy);
		logEvent(MetricsExplorerEvents.OrderByApplied, {
			[MetricsExplorerEventKeys.Tab]: 'summary',
			[MetricsExplorerEventKeys.ColumnName]: orderBy.key?.name,
			[MetricsExplorerEventKeys.Order]: orderBy.direction,
		});
	};

	const isMetricsListDataEmpty = useMemo(
		() => formattedMetricsData.length === 0 && !isGetMetricsStatsLoading,
		[formattedMetricsData, isGetMetricsStatsLoading],
	);

	const isMetricsTreeMapDataEmpty = useMemo(
		() =>
			!treeMapData?.data?.data?.[heatmapView]?.length &&
			!isGetMetricsTreemapLoading,
		[treeMapData?.data?.data, heatmapView, isGetMetricsTreemapLoading],
	);

	const showFullScreenLoading = useMemo(
		() =>
			(isGetMetricsStatsLoading || isGetMetricsTreemapLoading) &&
			formattedMetricsData.length === 0 &&
			!treeMapData?.data?.data?.[heatmapView]?.length,
		[
			isGetMetricsStatsLoading,
			isGetMetricsTreemapLoading,
			formattedMetricsData,
			treeMapData,
			heatmapView,
		],
	);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="metrics-explorer-summary-tab">
				<MetricsSearch query={query} onChange={handleFilterChange} />
				{showFullScreenLoading ? (
					<MetricsLoading />
				) : isMetricsListDataEmpty && isMetricsTreeMapDataEmpty ? (
					<NoLogs dataSource={DataSource.METRICS} />
				) : (
					<>
						<MetricsTreemap
							data={treeMapData?.data?.data}
							isLoading={isGetMetricsTreemapLoading}
							isError={isProportionViewError}
							viewType={heatmapView}
							openMetricDetails={openMetricDetails}
							setHeatmapView={handleSetHeatmapView}
						/>
						<MetricsTable
							isLoading={isGetMetricsStatsLoading}
							isError={isListViewError}
							data={formattedMetricsData}
							pageSize={pageSize}
							currentPage={currentPage}
							onPaginationChange={onPaginationChange}
							setOrderBy={handleSetOrderBy}
							totalCount={metricsData?.data?.data?.total || 0}
							openMetricDetails={openMetricDetails}
							queryFilterExpression={queryFilterExpression}
							onFilterChange={handleFilterChange}
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
