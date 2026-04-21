import { useCallback, useMemo, useRef } from 'react';
import ChartLayout from 'container/DashboardContainer/visualization/layout/ChartLayout/ChartLayout';
import Legend from 'lib/uPlotV2/components/Legend/Legend';
import {
	LegendPosition,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';
import UPlotChart from 'lib/uPlotV2/components/UPlotChart/UPlotChart';
import { PlotContextProvider } from 'lib/uPlotV2/context/PlotContext';
import TooltipPlugin from 'lib/uPlotV2/plugins/TooltipPlugin/TooltipPlugin';
import noop from 'lodash-es/noop';
import uPlot from 'uplot';

import { ChartProps } from '../types';

const TOOLTIP_WIDTH_PADDING = 120;
const TOOLTIP_MIN_WIDTH = 200;

export default function ChartWrapper({
	legendConfig = { position: LegendPosition.BOTTOM },
	config,
	data,
	width: containerWidth,
	height: containerHeight,
	showTooltip = true,
	showLegend = true,
	canPinTooltip = false,
	syncMode,
	syncKey,
	onDestroy = noop,
	children,
	layoutChildren,
	yAxisUnit,
	customTooltip,
	pinnedTooltipElement,
	'data-testid': testId,
}: ChartProps): JSX.Element {
	const plotInstanceRef = useRef<uPlot | null>(null);

	const legendComponent = useCallback(
		(averageLegendWidth: number): React.ReactNode => {
			if (!showLegend) {
				return null;
			}
			return (
				<Legend
					config={config}
					position={legendConfig.position}
					averageLegendWidth={averageLegendWidth}
				/>
			);
		},
		[config, legendConfig.position, showLegend],
	);

	const renderTooltipCallback = useCallback(
		(args: TooltipRenderArgs): React.ReactNode => {
			if (customTooltip) {
				return customTooltip(args);
			}
			return null;
		},
		[customTooltip],
	);

	const syncMetadata = useMemo(
		() => ({
			yAxisUnit,
		}),
		[yAxisUnit],
	);

	return (
		<PlotContextProvider>
			<ChartLayout
				showLegend={showLegend}
				config={config}
				containerWidth={containerWidth}
				containerHeight={containerHeight}
				legendConfig={legendConfig}
				legendComponent={legendComponent}
				layoutChildren={layoutChildren}
			>
				{({ chartWidth, chartHeight, averageLegendWidth }): JSX.Element => (
					<UPlotChart
						config={config}
						data={data}
						width={chartWidth}
						height={chartHeight}
						plotRef={(plot): void => {
							plotInstanceRef.current = plot;
						}}
						onDestroy={(plot: uPlot): void => {
							plotInstanceRef.current = null;
							onDestroy(plot);
						}}
						data-testid={testId}
					>
						{children}
						{showTooltip && (
							<TooltipPlugin
								config={config}
								canPinTooltip={canPinTooltip}
								syncMode={syncMode}
								maxWidth={Math.max(
									TOOLTIP_MIN_WIDTH,
									averageLegendWidth + TOOLTIP_WIDTH_PADDING,
								)}
								syncKey={syncKey}
								syncMetadata={syncMetadata}
								render={renderTooltipCallback}
								pinnedTooltipElement={pinnedTooltipElement}
							/>
						)}
					</UPlotChart>
				)}
			</ChartLayout>
		</PlotContextProvider>
	);
}
