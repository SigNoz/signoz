import { Color } from '@signozhq/design-tokens';
import { Card, Col, Input, Row, Select, Skeleton } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';
import { getUPlotChartOptions } from 'lib/uPlotLib/getUplotChartOptions';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { Gauge } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import RelatedMetricsCard from './RelatedMetricsCard';
import { RelatedMetricsProps, RelatedMetricWithQueryResult } from './types';
import { useGetRelatedMetricsGraphs } from './useGetRelatedMetricsGraphs';

function RelatedMetrics({ metricNames }: RelatedMetricsProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const graphRef = useRef<HTMLDivElement>(null);
	const dimensions = useResizeObserver(graphRef);
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [selectedMetricName, setSelectedMetricName] = useState<string | null>(
		null,
	);
	const [selectedRelatedMetric, setSelectedRelatedMetric] = useState('all');
	const [searchValue, setSearchValue] = useState<string | null>(null);

	const startMs = useMemo(() => Math.floor(Number(minTime) / 1000000000), [
		minTime,
	]);
	const endMs = useMemo(() => Math.floor(Number(maxTime) / 1000000000), [
		maxTime,
	]);

	useEffect(() => {
		if (metricNames.length) {
			setSelectedMetricName(metricNames[0]);
		}
	}, [metricNames]);

	const { relatedMetrics, isRelatedMetricsLoading } = useGetRelatedMetricsGraphs(
		{
			selectedMetricName,
			startMs,
			endMs,
		},
	);

	const metricNamesSelectOptions = useMemo(
		() =>
			metricNames.map((name) => ({
				value: name,
				label: name,
			})),
		[metricNames],
	);

	const relatedMetricsSelectOptions = useMemo(() => {
		const options: { value: string; label: string }[] = [
			{
				value: 'all',
				label: 'All',
			},
		];
		relatedMetrics.forEach((metric) => {
			options.push({
				value: metric.name,
				label: metric.name,
			});
		});
		return options;
	}, [relatedMetrics]);

	const filteredRelatedMetrics = useMemo(() => {
		let filteredMetrics: RelatedMetricWithQueryResult[] = [];
		if (selectedRelatedMetric === 'all') {
			filteredMetrics = [...relatedMetrics];
		} else {
			filteredMetrics = relatedMetrics.filter(
				(metric) => metric.name === selectedRelatedMetric,
			);
		}
		if (searchValue?.length) {
			filteredMetrics = filteredMetrics.filter((metric) =>
				metric.name.toLowerCase().includes(searchValue?.toLowerCase() ?? ''),
			);
		}
		return filteredMetrics;
	}, [relatedMetrics, selectedRelatedMetric, searchValue]);

	const chartData = useMemo(
		() =>
			filteredRelatedMetrics.map(({ queryResult }) =>
				getUPlotChartData(queryResult.data?.payload),
			),
		[filteredRelatedMetrics],
	);

	const options = useMemo(
		() =>
			filteredRelatedMetrics.map(({ queryResult }) =>
				getUPlotChartOptions({
					apiResponse: queryResult.data?.payload,
					isDarkMode,
					dimensions,
					yAxisUnit: '',
					softMax: null,
					softMin: null,
					minTimeScale: startMs,
					maxTimeScale: endMs,
				}),
			),
		[filteredRelatedMetrics, isDarkMode, dimensions, startMs, endMs],
	);

	return (
		<div className="related-metrics-container">
			<div className="related-metrics-header">
				<Select
					className="metric-name-select"
					value={selectedMetricName}
					options={metricNamesSelectOptions}
					onChange={(value): void => setSelectedMetricName(value)}
					suffixIcon={<Gauge size={12} color={Color.BG_SAKURA_500} />}
				/>
				<Input
					className="related-metrics-input"
					placeholder="Search..."
					onChange={(e): void => setSearchValue(e.target.value)}
					bordered
					addonBefore={
						<Select
							loading={isRelatedMetricsLoading}
							value={selectedRelatedMetric}
							className="related-metrics-select"
							options={relatedMetricsSelectOptions}
							onChange={(value): void => setSelectedRelatedMetric(value)}
							bordered={false}
						/>
					}
				/>
			</div>
			<div className="related-metrics-body">
				{isRelatedMetricsLoading && <Skeleton active />}
				<Row gutter={24}>
					{filteredRelatedMetrics.map((relatedMetricWithQueryResult, index) => (
						<Col span={8} key={relatedMetricWithQueryResult.name}>
							<Card bordered ref={graphRef} className="related-metrics-card-container">
								<RelatedMetricsCard
									key={relatedMetricWithQueryResult.name}
									metric={relatedMetricWithQueryResult}
									options={options[index]}
									chartData={chartData[index]}
								/>
							</Card>
						</Col>
					))}
				</Row>
			</div>
		</div>
	);
}

export default RelatedMetrics;
