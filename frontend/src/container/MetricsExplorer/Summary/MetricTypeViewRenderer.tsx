import { useMemo } from 'react';
import { Color } from '@signozhq/design-tokens';
import { Typography } from 'antd';
import { MetrictypesTypeDTO } from 'api/generated/services/sigNoz.schemas';
import {
	BarChart,
	BarChart2,
	BarChartHorizontal,
	Diff,
	Gauge,
} from 'lucide-react';

import { METRIC_TYPE_VIEW_VALUES_MAP } from './constants';

export function MetricTypeViewRenderer({
	type,
}: {
	type: MetrictypesTypeDTO;
}): JSX.Element {
	const [icon, color] = useMemo(() => {
		switch (type) {
			case MetrictypesTypeDTO.sum:
				return [
					<Diff key={type} size={12} color={Color.BG_ROBIN_500} />,
					Color.BG_ROBIN_500,
				];
			case MetrictypesTypeDTO.gauge:
				return [
					<Gauge key={type} size={12} color={Color.BG_SAKURA_500} />,
					Color.BG_SAKURA_500,
				];
			case MetrictypesTypeDTO.histogram:
				return [
					<BarChart2 key={type} size={12} color={Color.BG_SIENNA_500} />,
					Color.BG_SIENNA_500,
				];
			case MetrictypesTypeDTO.summary:
				return [
					<BarChartHorizontal key={type} size={12} color={Color.BG_FOREST_500} />,
					Color.BG_FOREST_500,
				];
			case MetrictypesTypeDTO.exponentialhistogram:
				return [
					<BarChart key={type} size={12} color={Color.BG_AQUA_500} />,
					Color.BG_AQUA_500,
				];
			default:
				return [null, ''];
		}
	}, [type]);

	const {
		metricTypeViewRendererStyle,
		metricTypeViewRendererTextStyle,
	} = useMemo(() => {
		return {
			metricTypeViewRendererStyle: {
				backgroundColor: `${color}33`,
				border: `1px solid ${color}`,
				color,
			},
			metricTypeViewRendererTextStyle: {
				color,
				fontSize: 12,
			},
		};
	}, [color]);

	return (
		<div className="metric-type-renderer" style={metricTypeViewRendererStyle}>
			{icon}
			<Typography.Text style={metricTypeViewRendererTextStyle}>
				{METRIC_TYPE_VIEW_VALUES_MAP[type]}
			</Typography.Text>
		</div>
	);
}

export default MetricTypeViewRenderer;
