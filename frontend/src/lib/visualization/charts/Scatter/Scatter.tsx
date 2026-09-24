import { useCallback } from 'react';
import ChartWrapper from 'lib/visualization/charts/ChartWrapper/ChartWrapper';
import ScatterTooltip from 'lib/uPlotV2/components/Tooltip/ScatterTooltip';
import {
	ScatterTooltipProps,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';
import uPlot from 'uplot';

import { ScatterChartProps } from 'lib/visualization/charts/types';

// Faceted uPlot reads series 1's facets at init, so a chart with no series cannot
// mount; empty aligned data makes the shell show its no-data state instead.
const EMPTY_ALIGNED_DATA: uPlot.AlignedData = [[]];

export default function Scatter(props: ScatterChartProps): JSX.Element {
	const {
		children,
		customTooltip,
		channels,
		resolvePointLabels,
		pinnedTooltipElement,
		...rest
	} = props;

	const renderTooltip = useCallback(
		(args: TooltipRenderArgs): React.ReactNode => {
			if (customTooltip) {
				return customTooltip(args);
			}
			const tooltipProps: ScatterTooltipProps = {
				...args,
				id: rest.config.getId(),
				channels,
				resolvePointLabels,
				decimalPrecision: rest.decimalPrecision,
				canPinTooltip: rest.canPinTooltip,
				renderTooltipFooter: rest.renderTooltipFooter,
			};
			return <ScatterTooltip {...tooltipProps} />;
		},
		[
			customTooltip,
			channels,
			resolvePointLabels,
			rest.config,
			rest.decimalPrecision,
			rest.canPinTooltip,
			rest.renderTooltipFooter,
		],
	);

	const hasSeries = rest.data.length > 1;

	return (
		<ChartWrapper
			{...rest}
			data={hasSeries ? rest.data : EMPTY_ALIGNED_DATA}
			customTooltip={renderTooltip}
			pinnedTooltipElement={pinnedTooltipElement}
		>
			{children}
		</ChartWrapper>
	);
}
