import { useCallback, useMemo, useRef } from 'react';
import { UseQueryResult } from 'react-query';
import { Skeleton } from 'antd';
import cx from 'classnames';
import { InfraMonitoringEvents } from 'constants/events';
import { PANEL_TYPES } from 'constants/queryBuilder';
import TimeSeries from 'container/DashboardContainer/visualization/charts/TimeSeries/TimeSeries';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { useMultiIntersectionObserver } from 'hooks/useMultiIntersectionObserver';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { useTimezone } from 'providers/Timezone';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { getMetricsExplorerUrl } from 'utils/explorerUtils';

import { buildEntityMetricsChartConfig } from './configBuilder';
import ChartHeader from './ChartHeader';

import EntityDateTimeSelector from '../EntityDateTimeSelector/EntityDateTimeSelector';
import { useEntityDetailsTime } from '../EntityDateTimeSelector/useEntityDetailsTime';
import { useEntityMetrics } from './hooks';
import { isKeyNotFoundError } from '../utils';

import styles from './EntityMetrics.module.scss';
import { MetricsTable } from './MetricsTable';

interface EntityMetricsProps<T> {
	entity: T;
	eventEntity: string;
	entityWidgetInfo: {
		title: string;
		yAxisUnit: string;
		docPath?: string;
	}[];
	getEntityQueryPayload: (
		node: T,
		start: number,
		end: number,
		dotMetricsEnabled: boolean,
	) => GetQueryResultsProps[];
	queryKey: string;
	category: InfraMonitoringEntity;
}

function EntityMetrics<T>({
	entity,
	eventEntity,
	entityWidgetInfo,
	getEntityQueryPayload,
	queryKey,
	category,
}: EntityMetricsProps<T>): JSX.Element {
	const { timeRange, selectedInterval, handleTimeChange } =
		useEntityDetailsTime();

	const { visibilities, setElement } = useMultiIntersectionObserver(
		entityWidgetInfo.length,
		{ threshold: 0.1 },
	);

	const { queries, chartData, tableData, queryPayloads } = useEntityMetrics({
		queryKey,
		timeRange,
		entity,
		getEntityQueryPayload,
		visibilities,
		category,
	});

	const isDarkMode = useIsDarkMode();
	const { timezone } = useTimezone();
	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);
	const { currentQuery } = useQueryBuilder();

	const onDragSelect = useCallback(
		(start: number, end: number): void => {
			// UPlotConfigBuilder's setSelect hook already delivers milliseconds
			handleTimeChange('custom', [Math.trunc(start), Math.trunc(end)]);
		},
		[handleTimeChange],
	);

	const configs = useMemo(
		() =>
			queries.map(({ data }, idx) => {
				const panelType = queryPayloads[idx]?.graphType;
				if (panelType === PANEL_TYPES.TABLE) {
					return null;
				}
				const widgetTitle = entityWidgetInfo[idx].title
					.toLowerCase()
					.replace(/\s+/g, '-');
				return buildEntityMetricsChartConfig({
					id: `${category}-${widgetTitle}`,
					isDarkMode,
					currentQuery,
					onDragSelect,
					apiResponse: data?.payload,
					timezone,
					yAxisUnit: entityWidgetInfo[idx].yAxisUnit,
					minTimeScale: timeRange.startTime,
					maxTimeScale: timeRange.endTime,
				});
			}),
		[
			queries,
			queryPayloads,
			category,
			isDarkMode,
			currentQuery,
			onDragSelect,
			timezone,
			entityWidgetInfo,
			timeRange.startTime,
			timeRange.endTime,
		],
	);

	const renderCardContent = (
		query: UseQueryResult<SuccessResponse<MetricRangePayloadProps>, unknown>,
		idx: number,
	): JSX.Element => {
		if (
			(!query.data && query.isLoading) ||
			query.isFetching ||
			!visibilities[idx]
		) {
			return <Skeleton />;
		}

		if (query.error && !isKeyNotFoundError(query.error)) {
			const errorMessage =
				(query.error as Error)?.message || 'Something went wrong';
			return <div>{errorMessage}</div>;
		}

		const panelType = queryPayloads[idx]?.graphType;

		return (
			<div
				className={cx(styles.chartContainer, {
					[styles.noDataContainer]:
						!query.isLoading && !query?.data?.payload?.data?.result?.length,
				})}
			>
				{panelType === PANEL_TYPES.TABLE ? (
					<MetricsTable
						rows={tableData[idx]?.[0]?.rows ?? []}
						columns={tableData[idx]?.[0]?.columns ?? []}
					/>
				) : (
					configs[idx] &&
					chartData[idx] && (
						<TimeSeries
							config={configs[idx]}
							data={chartData[idx]}
							legendConfig={{ position: LegendPosition.BOTTOM }}
							width={dimensions.width}
							height={dimensions.height}
							timezone={timezone}
							yAxisUnit={entityWidgetInfo[idx].yAxisUnit}
						/>
					)
				)}
			</div>
		);
	};

	return (
		<>
			<div className={styles.metricsHeader}>
				<EntityDateTimeSelector
					eventEntity={eventEntity}
					category={category}
					view={InfraMonitoringEvents.MetricsView}
				/>
			</div>
			<div className={styles.entityMetricsContainer}>
				{queries.map((query, idx) => (
					<div
						ref={setElement(idx)}
						key={entityWidgetInfo[idx].title}
						className={styles.entityMetricsCol}
					>
						<ChartHeader
							title={entityWidgetInfo[idx].title}
							docPath={entityWidgetInfo[idx].docPath}
							metricsExplorerUrl={
								queryPayloads[idx] && queryPayloads[idx].graphType !== PANEL_TYPES.TABLE
									? getMetricsExplorerUrl({
											query: queryPayloads[idx].query,
											...(selectedInterval && selectedInterval !== 'custom'
												? { relativeTime: selectedInterval }
												: {
														startTimeMs: timeRange.startTime * 1000,
														endTimeMs: timeRange.endTime * 1000,
													}),
										})
									: undefined
							}
							metricsExplorerTestId={`open-metrics-explorer-${idx}`}
						/>
						<div className={styles.entityMetricsCard} ref={graphRef}>
							{renderCardContent(query, idx)}
						</div>
					</div>
				))}
			</div>
		</>
	);
}

export default EntityMetrics;
