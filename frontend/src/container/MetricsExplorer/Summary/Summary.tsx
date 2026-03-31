/* eslint-disable no-nested-ternary */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux'; // old code, TODO: fix this correctly
import { useSearchParams } from 'react-router-dom-v5-compat';
import * as Sentry from '@sentry/react';
import logEvent from 'api/common/logEvent';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	useGetMetricsStats,
	useGetMetricsTreemap,
} from 'api/generated/services/metrics';
import {
	MetricsexplorertypesStatsRequestDTO,
	MetricsexplorertypesTreemapModeDTO,
	MetricsexplorertypesTreemapRequestDTO,
	Querybuildertypesv5OrderByDTO,
	Querybuildertypesv5OrderDirectionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { convertExpressionToFilters } from 'components/QueryBuilderV2/utils';
import { initialQueriesMap } from 'constants/queryBuilder';
import { usePageSize } from 'container/InfraMonitoringK8s/utils';
import NoLogs from 'container/NoLogs/NoLogs';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { AppState } from 'store/reducers';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { isModifierKeyPressed } from 'utils/app';
import { openInNewTab } from 'utils/navigation';

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
	direction: Querybuildertypesv5OrderDirectionDTO.desc,
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
		MetricsexplorertypesTreemapModeDTO.samples,
	);

	const {
		currentQuery,
		stagedQuery,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();

	useShareBuilderUrl({ defaultValue: initialQueriesMap[DataSource.METRICS] });

	const query = useMemo(
		() =>
			stagedQuery?.builder?.queryData?.[0] ||
			initialQueriesMap[DataSource.METRICS].builder.queryData[0],
		[stagedQuery],
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

	const appliedFilterExpression = query?.filter?.expression || '';

	const [
		currentQueryFilterExpression,
		setCurrentQueryFilterExpression,
	] = useState<string>(appliedFilterExpression);

	useEffect(() => {
		setCurrentQueryFilterExpression(appliedFilterExpression);
	}, [appliedFilterExpression]);

	const queryFilterExpression = useMemo(
		() => ({ expression: appliedFilterExpression }),
		[appliedFilterExpression],
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

	const metricsListQuery: MetricsexplorertypesStatsRequestDTO = useMemo(() => {
		return {
			start: convertNanoToMilliseconds(minTime),
			end: convertNanoToMilliseconds(maxTime),
			limit: pageSize,
			offset: (currentPage - 1) * pageSize,
			orderBy,
			filter: {
				expression: queryFilterExpression.expression,
			},
		};
	}, [
		minTime,
		maxTime,
		orderBy,
		pageSize,
		currentPage,
		queryFilterExpression.expression,
	]);

	const metricsTreemapQuery: MetricsexplorertypesTreemapRequestDTO = useMemo(
		() => ({
			limit: 100,
			treemap: heatmapView,
			start: convertNanoToMilliseconds(minTime),
			end: convertNanoToMilliseconds(maxTime),
			mode: heatmapView,
			filter: {
				expression: queryFilterExpression.expression,
			},
		}),
		[heatmapView, minTime, maxTime, queryFilterExpression.expression],
	);

	const {
		data: metricsData,
		mutate: getMetricsStats,
		isLoading: isGetMetricsStatsLoading,
		isError: isGetMetricsStatsError,
		error: metricsStatsError,
	} = useGetMetricsStats();

	const {
		data: treeMapData,
		mutate: getMetricsTreemap,
		isLoading: isGetMetricsTreemapLoading,
		isError: isGetMetricsTreemapError,
		error: metricsTreemapError,
	} = useGetMetricsTreemap();

	const metricsStatsApiError = useMemo(
		() => convertToApiError(metricsStatsError),
		[metricsStatsError],
	);

	const metricsTreemapApiError = useMemo(
		() => convertToApiError(metricsTreemapError),
		[metricsTreemapError],
	);

	useEffect(() => {
		getMetricsStats({
			data: metricsListQuery,
		});
	}, [metricsListQuery, getMetricsStats]);

	useEffect(() => {
		getMetricsTreemap({
			data: metricsTreemapQuery,
		});
	}, [metricsTreemapQuery, getMetricsTreemap]);

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
		() => formatDataForMetricsTable(metricsData?.data.metrics || []),
		[metricsData],
	);

	const openMetricDetails = (
		metricName: string,
		view: 'list' | 'treemap',
		event?: React.MouseEvent,
	): void => {
		if (event && isModifierKeyPressed(event)) {
			const newParams = new URLSearchParams(searchParams);
			newParams.set(IS_METRIC_DETAILS_OPEN_KEY, 'true');
			newParams.set(SELECTED_METRIC_NAME_KEY, metricName);
			openInNewTab(`${window.location.pathname}?${newParams.toString()}`);
			return;
		}
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

	const isMetricsListDataEmpty =
		formattedMetricsData.length === 0 &&
		!isGetMetricsStatsLoading &&
		!isGetMetricsStatsError;

	const isMetricsTreeMapDataEmpty =
		!treeMapData?.data[heatmapView]?.length &&
		!isGetMetricsTreemapLoading &&
		!isGetMetricsTreemapError;

	const showFullScreenLoading =
		(isGetMetricsStatsLoading || isGetMetricsTreemapLoading) &&
		formattedMetricsData.length === 0 &&
		!treeMapData?.data[heatmapView]?.length;

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="metrics-explorer-summary-tab">
				<MetricsSearch
					query={query}
					onChange={handleFilterChange}
					currentQueryFilterExpression={currentQueryFilterExpression}
					setCurrentQueryFilterExpression={setCurrentQueryFilterExpression}
					isLoading={isGetMetricsStatsLoading || isGetMetricsTreemapLoading}
				/>
				{showFullScreenLoading ? (
					<MetricsLoading />
				) : isMetricsListDataEmpty &&
				  isMetricsTreeMapDataEmpty &&
				  !appliedFilterExpression ? (
					<NoLogs dataSource={DataSource.METRICS} />
				) : (
					<>
						<MetricsTreemap
							data={treeMapData?.data}
							isLoading={isGetMetricsTreemapLoading}
							isError={isGetMetricsTreemapError}
							error={metricsTreemapApiError}
							viewType={heatmapView}
							openMetricDetails={openMetricDetails}
							setHeatmapView={handleSetHeatmapView}
						/>
						<MetricsTable
							isLoading={isGetMetricsStatsLoading}
							isError={isGetMetricsStatsError}
							error={metricsStatsApiError}
							data={formattedMetricsData}
							pageSize={pageSize}
							currentPage={currentPage}
							onPaginationChange={onPaginationChange}
							setOrderBy={handleSetOrderBy}
							totalCount={metricsData?.data.total || 0}
							openMetricDetails={openMetricDetails}
							queryFilterExpression={queryFilterExpression}
							onFilterChange={handleFilterChange}
						/>
					</>
				)}
			</div>
			{isMetricDetailsOpen && selectedMetricName && (
				<MetricDetails
					isOpen={isMetricDetailsOpen}
					onClose={closeMetricDetails}
					metricName={selectedMetricName}
					isModalTimeSelection={false}
					openInspectModal={openInspectModal}
				/>
			)}
			{isInspectModalOpen && selectedMetricName && (
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
