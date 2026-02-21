import { useMemo } from 'react';
import { Color } from '@signozhq/design-tokens';
import { Typography } from 'antd';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import {
	BarChart,
	BarChart2,
	BarChartHorizontal,
	Diff,
	Gauge,
} from 'lucide-react';

import { METRIC_TYPE_LABEL_MAP } from './constants';

function MetricTypeRenderer({ type }: { type: MetricType }): JSX.Element {
	const [icon, color] = useMemo(() => {
		switch (type) {
			case MetricType.SUM:
				return [
					<Diff key={type} size={12} color={Color.BG_ROBIN_500} />,
					Color.BG_ROBIN_500,
				];
			case MetricType.GAUGE:
				return [
					<Gauge key={type} size={12} color={Color.BG_SAKURA_500} />,
					Color.BG_SAKURA_500,
				];
			case MetricType.HISTOGRAM:
				return [
					<BarChart2 key={type} size={12} color={Color.BG_SIENNA_500} />,
					Color.BG_SIENNA_500,
				];
			case MetricType.SUMMARY:
				return [
					<BarChartHorizontal key={type} size={12} color={Color.BG_FOREST_500} />,
					Color.BG_FOREST_500,
				];
			case MetricType.EXPONENTIAL_HISTOGRAM:
				return [
					<BarChart key={type} size={12} color={Color.BG_AQUA_500} />,
					Color.BG_AQUA_500,
				];
			default:
				return [null, ''];
		}
	}, [type]);

	return (
		<div
			className="metric-type-renderer"
			style={{
				backgroundColor: `${color}33`,
				border: `1px solid ${color}`,
				color,
			}}
		>
			{icon}
			<Typography.Text style={{ color, fontSize: 12 }}>
				{METRIC_TYPE_LABEL_MAP[type]}
			</Typography.Text>
		</div>
	);
}

export default MetricTypeRenderer;
