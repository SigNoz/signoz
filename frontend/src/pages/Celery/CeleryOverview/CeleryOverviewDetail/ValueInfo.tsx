import './ValueInfo.styles.scss';

import { FileSearchOutlined } from '@ant-design/icons';
import { Button, Card, Col, Row } from 'antd';
import logEvent from 'api/common/logEvent';
import { useNavigateToTraces } from 'components/CeleryTask/useNavigateToTraces';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useCallback, useMemo } from 'react';
import { useQueries } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';
import { v4 as uuidv4 } from 'uuid';

import {
	celeryOverviewAvgLatencyWidgetData,
	celeryOverviewErrorRateWidgetData,
	celeryOverviewRequestRateWidgetData,
} from '../CeleryOverviewGraphUtils';
import { getQueryPayloadFromWidgetsData } from '../CeleryOverviewUtils';

export default function ValueInfo({
	filters,
}: {
	filters?: TagFilterItem[];
}): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	// get data from api
	const queryPayloads = useMemo(
		() =>
			getQueryPayloadFromWidgetsData({
				start: Math.floor(minTime / 1000000000),
				end: Math.floor(maxTime / 1000000000),
				widgetsData: [
					celeryOverviewRequestRateWidgetData(filters),
					celeryOverviewErrorRateWidgetData(filters),
					celeryOverviewAvgLatencyWidgetData(filters),
				],
				panelType: PANEL_TYPES.VALUE,
			}),
		[minTime, maxTime, filters],
	);

	const queries = useQueries(
		queryPayloads.map((payload) => ({
			queryKey: [
				'overview-detail',
				payload,
				ENTITY_VERSION_V4,
				'overview-right-panel',
			],
			queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(payload, ENTITY_VERSION_V4),
			enabled: !!payload,
		})),
	);

	const getValues = useCallback(
		() =>
			queries.map((query) => {
				const value = parseFloat(
					query.data?.payload?.data?.newResult?.data?.result?.[0]?.series?.[0]
						?.values?.[0]?.value || 'NaN',
				);
				return Number.isNaN(value) ? 'NaN' : value.toFixed(2);
			}),
		[queries],
	);

	const isLoading = queries.some((query) => query.isLoading);
	const [requestRate, errorRate, avgLatency] = useMemo(
		() => (isLoading ? ['0', '0', '0'] : getValues()),
		[isLoading, getValues],
	);

	const navigateToTrace = useNavigateToTraces();

	const avgLatencyInMs = useMemo(() => {
		if (avgLatency === 'NaN') return 'NaN';
		const numericValue = parseFloat(avgLatency);
		return (numericValue / 1000000).toFixed(2);
	}, [avgLatency]);

	const getColorBasedOnValue = (value: string): string => {
		const numericValue = parseFloat(value);
		if (value === 'NaN') return 'gray';
		if (numericValue < 3) return 'green';
		if (numericValue < 8) return 'yellow';
		return 'red';
	};

	const getColorForLatency = (value: string): string => {
		const numericValue = parseFloat(value);
		if (value === 'NaN') return 'gray';
		if (numericValue < 100) return 'green';
		if (numericValue < 200) return 'yellow';
		return 'red';
	};

	const getColorForErrorRate = (value: string): string => {
		const numericValue = parseFloat(value);
		if (value === 'NaN') return 'gray';
		if (numericValue < 60) return 'green';
		if (numericValue < 90) return 'yellow';
		return 'red';
	};

	const mqAnalyticsTitle =
		'MQ Overview Page: Right drawer navigation to trace page';

	return (
		<Card className="value-info-card">
			<Row gutter={16}>
				<Col span={8} className="metric-column">
					<div className="metric-title">Request Rate</div>
					<div className="metric-value-container">
						<div
							className={`metric-value ${getColorBasedOnValue(requestRate)} ${
								isLoading ? 'loading' : ''
							}`}
						>
							{requestRate === 'NaN' ? '0' : requestRate}
						</div>
						<div className="metric-unit">req/s</div>
					</div>
					<Button
						type="primary"
						icon={<FileSearchOutlined />}
						className="trace-button"
						disabled={isLoading}
						onClick={(): void => {
							logEvent(mqAnalyticsTitle, {
								filters,
								minTime,
								maxTime,
								source: 'request rate',
							});
							navigateToTrace(filters ?? []);
						}}
					>
						View Traces
					</Button>
				</Col>
				<Col span={8} className="metric-column">
					<div className="metric-title">Error Rate</div>
					<div className="metric-value-container">
						<div
							className={`metric-value ${getColorForErrorRate(errorRate)} ${
								isLoading ? 'loading' : ''
							}`}
						>
							{errorRate === 'NaN' ? '0' : errorRate}
						</div>
						<div className="metric-unit">%</div>
					</div>
					<Button
						type="primary"
						icon={<FileSearchOutlined />}
						className="trace-button"
						disabled={isLoading}
						onClick={(): void => {
							logEvent(mqAnalyticsTitle, {
								filters,
								minTime,
								maxTime,
								source: 'error rate',
							});
							navigateToTrace([
								...(filters ?? []),
								{
									id: uuidv4(),
									key: {
										dataType: DataTypes.bool,
										id: 'has_error--bool----true',
										isColumn: true,
										isJSON: false,
										key: 'has_error',
										type: '',
									},
									op: '=',
									value: 'true',
								},
							]);
						}}
					>
						View Traces
					</Button>
				</Col>
				<Col span={8} className="metric-column">
					<div className="metric-title">Average Latency</div>
					<div className="metric-value-container">
						<div
							className={`metric-value ${getColorForLatency(avgLatencyInMs)} ${
								isLoading ? 'loading' : ''
							}`}
						>
							{avgLatencyInMs === 'NaN' ? '0' : avgLatencyInMs}
						</div>
						<div className="metric-unit">ms</div>
					</div>
					<Button
						type="primary"
						icon={<FileSearchOutlined />}
						className="trace-button"
						disabled={isLoading}
						onClick={(): void => {
							logEvent(mqAnalyticsTitle, {
								filters,
								minTime,
								maxTime,
								source: 'average latency',
							});
							navigateToTrace(filters ?? []);
						}}
					>
						View Traces
					</Button>
				</Col>
			</Row>
		</Card>
	);
}

ValueInfo.defaultProps = {
	filters: undefined,
};
