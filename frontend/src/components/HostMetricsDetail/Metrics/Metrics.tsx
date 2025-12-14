import './Metrics.styles.scss';

import { Card, Col, Row, Skeleton, Typography } from 'antd';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { ENTITY_VERSION_V4 } from 'constants/app';
import {
	getHostQueryPayload,
	hostWidgetInfo,
} from 'container/LogDetailedView/InfraMetrics/constants';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { useMultiIntersectionObserver } from 'hooks/useMultiIntersectionObserver';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QueryFunctionContext, useQueries, UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { FeatureKeys } from '../../../constants/features';
import { useAppContext } from '../../../providers/App/App';

interface MetricsTabProps {
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

	hostName: string;
}

function Metrics({
	selectedInterval,
	hostName,
	timeRange,
	handleTimeChange,
	isModalTimeSelection,
}: MetricsTabProps): JSX.Element {
	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const {
		visibilities,
		setElement,
	} = useMultiIntersectionObserver(hostWidgetInfo.length, { threshold: 0.1 });

	const legendScrollPositionRef = useRef<{
		scrollTop: number;
		scrollLeft: number;
	}>({
		scrollTop: 0,
		scrollLeft: 0,
	});

	const queryPayloads = useMemo(
		() =>
			getHostQueryPayload(
				hostName,
				timeRange.startTime,
				timeRange.endTime,
				dotMetricsEnabled,
			),
		[hostName, timeRange.startTime, timeRange.endTime, dotMetricsEnabled],
	);

	const queries = useQueries(
		queryPayloads.map((payload, index) => ({
			queryKey: ['host-metrics', payload, ENTITY_VERSION_V4, 'HOST'],
			queryFn: ({
				signal,
			}: QueryFunctionContext): Promise<
				SuccessResponse<MetricRangePayloadProps>
			> => GetMetricQueryRange(payload, ENTITY_VERSION_V4, undefined, signal),
			enabled: !!payload && visibilities[index],
			keepPreviousData: true,
		})),
	);

	const isDarkMode = useIsDarkMode();
	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);
	const { currentQuery } = useQueryBuilder();

	const chartData = useMemo(
		() => queries.map(({ data }) => getUPlotChartData(data?.payload)),
		[queries],
	);

	const [graphTimeIntervals, setGraphTimeIntervals] = useState<
		{
			start: number;
			end: number;
		}[]
	>(
		new Array(queries.length).fill({
			start: timeRange.startTime,
			end: timeRange.endTime,
		}),
	);

	useEffect(() => {
		setGraphTimeIntervals(
			new Array(queries.length).fill({
				start: timeRange.startTime,
				end: timeRange.endTime,
			}),
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [timeRange]);

	const onDragSelect = useCallback(
		(start: number, end: number, graphIndex: number) => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			setGraphTimeIntervals((prev) => {
				const newIntervals = [...prev];
				newIntervals[graphIndex] = {
					start: Math.floor(startTimestamp / 1000),
					end: Math.floor(endTimestamp / 1000),
				};
				return newIntervals;
			});
		},
		[],
	);

	const options = useMemo(
		() =>
			queries.map(({ data }, idx) =>
				getUPlotChartOptions({
					apiResponse: data?.payload,
					isDarkMode,
					dimensions,
					yAxisUnit: hostWidgetInfo[idx].yAxisUnit,
					softMax: null,
					softMin: null,
					minTimeScale: graphTimeIntervals[idx].start,
					maxTimeScale: graphTimeIntervals[idx].end,
					onDragSelect: (start, end) => onDragSelect(start, end, idx),
					query: currentQuery,
					legendScrollPosition: legendScrollPositionRef.current,
					setLegendScrollPosition: (position: {
						scrollTop: number;
						scrollLeft: number;
					}) => {
						legendScrollPositionRef.current = position;
					},
				}),
			),
		[
			queries,
			isDarkMode,
			dimensions,
			graphTimeIntervals,
			onDragSelect,
			currentQuery,
		],
	);

	const renderCardContent = (
		query: UseQueryResult<SuccessResponse<MetricRangePayloadProps>, unknown>,
		idx: number,
	): JSX.Element => {
		if ((!query.data && query.isLoading) || !visibilities[idx]) {
			return <Skeleton />;
		}

		if (query.error) {
			const errorMessage =
				(query.error as Error)?.message || 'Something went wrong';
			return <div>{errorMessage}</div>;
		}
		return (
			<div
				className={cx('chart-container', {
					'no-data-container':
						!query.isLoading && !query?.data?.payload?.data?.result?.length,
				})}
			>
				<Uplot options={options[idx]} data={chartData[idx]} />
			</div>
		);
	};

	return (
		<>
			<div className="metrics-header">
				<div className="metrics-datetime-section">
					<DateTimeSelectionV2
						showAutoRefresh
						showRefreshText={false}
						hideShareModal
						onTimeChange={handleTimeChange}
						defaultRelativeTime="5m"
						isModalTimeSelection={isModalTimeSelection}
						modalSelectedInterval={selectedInterval}
					/>
				</div>
			</div>
			<Row gutter={24} className="host-metrics-container">
				{queries.map((query, idx) => (
					<Col ref={setElement(idx)} span={12} key={hostWidgetInfo[idx].title}>
						<Typography.Text>{hostWidgetInfo[idx].title}</Typography.Text>
						<Card bordered className="host-metrics-card" ref={graphRef}>
							{renderCardContent(query, idx)}
						</Card>
					</Col>
				))}
			</Row>
		</>
	);
}

export default Metrics;
