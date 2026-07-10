import { Color } from '@signozhq/design-tokens';
import { Typography } from '@signozhq/ui/typography';
import { MetrictypesTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { BarChart, ChartBar, Diff, Gauge } from '@signozhq/icons';

import { METRIC_TYPE_VIEW_VALUES_MAP } from './constants';

export function MetricTypeViewRenderer({
	type,
}: {
	type: MetrictypesTypeDTO;
}): JSX.Element {
	let icon: JSX.Element | null = null;
	let color = '';

	switch (type) {
		case MetrictypesTypeDTO.sum:
			icon = <Diff key={type} size={12} color={Color.BG_ROBIN_500} />;
			color = Color.BG_ROBIN_500;
			break;
		case MetrictypesTypeDTO.gauge:
			icon = <Gauge key={type} size={12} color={Color.BG_SAKURA_500} />;
			color = Color.BG_SAKURA_500;
			break;
		case MetrictypesTypeDTO.histogram:
			icon = <BarChart key={type} size={12} color={Color.BG_SIENNA_500} />;
			color = Color.BG_SIENNA_500;
			break;
		case MetrictypesTypeDTO.summary:
			icon = <ChartBar key={type} size={12} color={Color.BG_FOREST_500} />;
			color = Color.BG_FOREST_500;
			break;
		case MetrictypesTypeDTO.exponentialhistogram:
			icon = <BarChart key={type} size={12} color={Color.BG_AQUA_500} />;
			color = Color.BG_AQUA_500;
			break;
		default:
			break;
	}

	const metricTypeViewRendererStyle = {
		backgroundColor: `${color}33`,
		border: `1px solid ${color}`,
		color,
	};
	const metricTypeViewRendererTextStyle = {
		color,
		fontSize: 12,
	};

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
