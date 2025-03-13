import { Color } from '@signozhq/design-tokens';
import { Card, Col, Empty, Input, Row, Select, Skeleton } from 'antd';
import { Gauge } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import RelatedMetricsCard from './RelatedMetricsCard';
import { RelatedMetricsProps, RelatedMetricWithQueryResult } from './types';
import { useGetRelatedMetricsGraphs } from './useGetRelatedMetricsGraphs';

function RelatedMetrics({ metricNames }: RelatedMetricsProps): JSX.Element {
	const graphRef = useRef<HTMLDivElement>(null);
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

	const {
		relatedMetrics,
		isRelatedMetricsLoading,
		isRelatedMetricsError,
	} = useGetRelatedMetricsGraphs({
		selectedMetricName,
		startMs,
		endMs,
	});

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
				{isRelatedMetricsError && (
					<Empty description="Error fetching related metrics" />
				)}
				{!isRelatedMetricsLoading &&
					!isRelatedMetricsError &&
					filteredRelatedMetrics.length === 0 && (
						<Empty description="No related metrics found" />
					)}
				{!isRelatedMetricsLoading &&
					!isRelatedMetricsError &&
					filteredRelatedMetrics.length > 0 && (
						<Row gutter={24}>
							{filteredRelatedMetrics.map((relatedMetricWithQueryResult) => (
								<Col span={12} key={relatedMetricWithQueryResult.name}>
									<Card
										bordered
										ref={graphRef}
										className="related-metrics-card-container"
									>
										<RelatedMetricsCard
											key={relatedMetricWithQueryResult.name}
											metric={relatedMetricWithQueryResult}
										/>
									</Card>
								</Col>
							))}
						</Row>
					)}
			</div>
		</div>
	);
}

export default RelatedMetrics;
