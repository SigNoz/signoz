import { useCallback, useMemo, useRef } from 'react';
import { UseQueryResult } from 'react-query';
import { Skeleton } from 'antd';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8s/constants';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { AlignedData, Options } from 'uplot';

import { useMultiIntersectionObserver } from 'hooks/useMultiIntersectionObserver';

import { useEntityMetrics } from './hooks';

import styles from './EntityMetrics.module.scss';
import { MetricsTable } from './MetricsTable';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';

interface EntityMetricsProps<T> {
	timeRange: {
		startTime: number;
		endTime: number;
	};
	isModalTimeSelection: boolean;
	handleTimeChange: (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	) => void;
	selectedInterval: Time;
	entity: T;
	entityWidgetInfo: {
		title: string;
		yAxisUnit: string;
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
	selectedInterval,
	entity,
	timeRange,
	handleTimeChange,
	isModalTimeSelection,
	entityWidgetInfo,
	getEntityQueryPayload,
	queryKey,
	category,
}: EntityMetricsProps<T>): JSX.Element {
	const { visibilities, setElement } = useMultiIntersectionObserver(
		entityWidgetInfo.length,
		{ threshold: 0.1 },
	);

	const { queries, chartData, queryPayloads } = useEntityMetrics({
		queryKey,
		timeRange,
		entity,
		getEntityQueryPayload,
		visibilities,
		category,
	});

	const isDarkMode = useIsDarkMode();
	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);
	const { currentQuery } = useQueryBuilder();
	const legendScrollPositionRef = useRef<{
		scrollTop: number;
		scrollLeft: number;
	}>({
		scrollTop: 0,
		scrollLeft: 0,
	});

	const onDragSelect = useCallback(
		(start: number, end: number): void => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			handleTimeChange('custom', [startTimestamp, endTimestamp]);
		},
		[handleTimeChange],
	);

	const options = useMemo(
		() =>
			queries.map(({ data }, idx) => {
				const panelType = queryPayloads[idx]?.graphType;
				if (panelType === PANEL_TYPES.TABLE) {
					return null;
				}
				return getUPlotChartOptions({
					apiResponse: data?.payload,
					isDarkMode,
					dimensions,
					yAxisUnit: entityWidgetInfo[idx].yAxisUnit,
					softMax: null,
					softMin: null,
					minTimeScale: timeRange.startTime,
					maxTimeScale: timeRange.endTime,
					onDragSelect,
					query: currentQuery,
					legendScrollPosition: legendScrollPositionRef.current,
					setLegendScrollPosition: (position: {
						scrollTop: number;
						scrollLeft: number;
					}): void => {
						legendScrollPositionRef.current = position;
					},
				});
			}),
		[
			queries,
			queryPayloads,
			isDarkMode,
			dimensions,
			entityWidgetInfo,
			timeRange.startTime,
			timeRange.endTime,
			onDragSelect,
			currentQuery,
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

		if (query.error) {
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
						rows={chartData[idx]?.[0]?.rows ?? []}
						columns={chartData[idx]?.[0]?.columns ?? []}
					/>
				) : (
					<Uplot
						options={options[idx] as Options}
						data={chartData[idx] as AlignedData}
					/>
				)}
			</div>
		);
	};

	return (
		<>
			<div className={styles.metricsHeader}>
				<DateTimeSelectionV2
					showAutoRefresh
					showRefreshText={false}
					hideShareModal
					onTimeChange={handleTimeChange}
					defaultRelativeTime={DEFAULT_TIME_RANGE}
					isModalTimeSelection={isModalTimeSelection}
					modalSelectedInterval={selectedInterval}
					modalInitialStartTime={timeRange.startTime * 1000}
					modalInitialEndTime={timeRange.endTime * 1000}
				/>
			</div>
			<div className={styles.entityMetricsContainer}>
				{queries.map((query, idx) => (
					<div
						ref={setElement(idx)}
						key={entityWidgetInfo[idx].title}
						className={styles.entityMetricsCol}
					>
						<span className={styles.entityMetricsTitle}>
							{entityWidgetInfo[idx].title}
						</span>
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
