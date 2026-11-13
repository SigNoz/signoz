import { useMemo } from 'react';
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
					<BarChart key={type} size={12} color={Color.BG_SIENNA_500} />,
					Color.BG_SIENNA_500,
				];
			case MetrictypesTypeDTO.summary:
				return [
					<ChartBar key={type} size={12} color={Color.BG_FOREST_500} />,
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

	const metricTypeViewRendererStyle = useMemo(
		() => ({
			backgroundColor: `${color}33`,
			border: `1px solid ${color}`,
			color,
		}),
		[color],
	);

	return (
		<div className="metric-type-renderer" style={metricTypeViewRendererStyle}>
			{icon}
			<Typography
				variant="uppercase"
				size="small"
				weight="regular"
				color="inherit"
				as="span"
				textOverflow="visible"
			>
				{METRIC_TYPE_VIEW_VALUES_MAP[type]}
			</Typography>
		</div>
	);
}

export default MetricTypeViewRenderer;
