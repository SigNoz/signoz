import './entityMetrics.styles.scss';

import { Card, Col, Row, Skeleton, Typography } from 'antd';
import cx from 'classnames';
import Uplot from 'components/Uplot';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	getMetricsTableData,
	MetricsTable,
} from 'container/InfraMonitoringK8s/commonUtils';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import {
	GetMetricQueryRange,
	GetQueryResultsProps,
} from 'lib/dashboard/getQueryResults';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { useCallback, useMemo, useRef } from 'react';
import { useQueries, UseQueryResult } from 'react-query';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions/global';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Options } from 'uplot';

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
	) => GetQueryResultsProps[];
	queryKey: string;
	category: K8sCategory;
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
	const queryPayloads = useMemo(
		() => getEntityQueryPayload(entity, timeRange.startTime, timeRange.endTime),
		[getEntityQueryPayload, entity, timeRange.startTime, timeRange.endTime],
	);

	const urlQuery = useUrlQuery();
	const { pathname } = useLocation();
	const { safeNavigate } = useSafeNavigate();
	const dispatch = useDispatch();

	const queries = useQueries(
		queryPayloads.map((payload) => ({
			queryKey: [queryKey, payload, ENTITY_VERSION_V4, category],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, ENTITY_VERSION_V4),
			enabled: !!payload,
		})),
	);

	const isDarkMode = useIsDarkMode();
	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);

	const chartData = useMemo(
		() =>
			queries.map(({ data }) => {
				const panelType = (data?.params as any)?.compositeQuery?.panelType;
				return panelType === PANEL_TYPES.TABLE
					? getMetricsTableData(data)
					: getUPlotChartData(data?.payload);
			}),
		[queries],
	);

	const onDragSelect = useCallback(
		(start: number, end: number) => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			urlQuery.set(QueryParams.startTime, startTimestamp.toString());
			urlQuery.set(QueryParams.endTime, endTimestamp.toString());
			const generatedUrl = `${pathname}?${urlQuery.toString()}`;
			safeNavigate(generatedUrl);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}
		},
		[dispatch, pathname, safeNavigate, urlQuery],
	);

	const options = useMemo(
		() =>
			queries.map(({ data }, idx) => {
				const panelType = (data?.params as any)?.compositeQuery?.panelType;
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
					// enableZoom: true,
					onDragSelect,
				});
			}),
		[
			queries,
			isDarkMode,
			dimensions,
			entityWidgetInfo,
			timeRange.startTime,
			timeRange.endTime,
			onDragSelect,
		],
	);

	const renderCardContent = (
		query: UseQueryResult<SuccessResponse<MetricRangePayloadProps>, unknown>,
		idx: number,
	): JSX.Element => {
		if (query.isLoading) {
			return <Skeleton />;
		}

		if (query.error) {
			const errorMessage =
				(query.error as Error)?.message || 'Something went wrong';
			return <div>{errorMessage}</div>;
		}

		const { panelType } = (query.data?.params as any).compositeQuery;

		return (
			<div
				className={cx('chart-container', {
					'no-data-container':
						!query.isLoading && !query?.data?.payload?.data?.result?.length,
				})}
			>
				{panelType === PANEL_TYPES.TABLE ? (
					<MetricsTable
						rows={chartData[idx][0].rows}
						columns={chartData[idx][0].columns}
					/>
				) : (
					<Uplot options={options[idx] as Options} data={chartData[idx]} />
				)}
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
			<Row gutter={24} className="entity-metrics-container">
				{queries.map((query, idx) => (
					<Col span={12} key={entityWidgetInfo[idx].title}>
						<Typography.Text>{entityWidgetInfo[idx].title}</Typography.Text>
						<Card bordered className="entity-metrics-card" ref={graphRef}>
							{renderCardContent(query, idx)}
						</Card>
					</Col>
				))}
			</Row>
		</>
	);
}

export default EntityMetrics;
