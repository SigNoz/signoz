import { useCallback, useMemo, useRef } from 'react';
import ChartLayout from 'container/DashboardContainer/visualization/layout/ChartLayout/ChartLayout';
import UPlotLegend from 'lib/uPlotV2/components/Legend/UPlotLegend';
import {
	LegendPosition,
	TooltipRenderArgs,
} from 'lib/uPlotV2/components/types';
import UPlotChart from 'lib/uPlotV2/components/UPlotChart/UPlotChart';
import { StackMode } from 'lib/uPlotV2/config/types';
import { prepareAlignedData } from 'lib/uPlotV2/components/UPlotChart/utils';
import { PlotContextProvider } from 'lib/uPlotV2/context/PlotContext';
import TooltipPlugin from 'lib/uPlotV2/plugins/TooltipPlugin/TooltipPlugin';
import noop from 'lodash-es/noop';
import uPlot from 'uplot';

import { ChartWrapperProps } from '../types';
import { useChartStacking } from './useChartStacking';

const TOOLTIP_WIDTH_PADDING = 120;
const TOOLTIP_MIN_WIDTH = 300;

export default function ChartWrapper({
	legendConfig = { position: LegendPosition.BOTTOM },
	config,
	data,
	width: containerWidth,
	height: containerHeight,
	showTooltip = true,
	showLegend = true,
	canPinTooltip = false,
	pinKey,
	onClick,
	syncMode,
	syncKey,
	syncFilterMode,
	onDestroy = noop,
	children,
	layoutChildren,
	yAxisUnit,
	groupByPerQuery,
	customTooltip,
	pinnedTooltipElement,
	tooltipPortalRoot,
	'data-testid': testId,
}: ChartWrapperProps): JSX.Element {
	const plotInstanceRef = useRef<uPlot | null>(null);

	const stack = config.getStackMode();
	const chartData = useChartStacking({ data, config });

	// Tooltips need pre-stack values, gap-processed exactly as UPlotChart processes the
	// plot data — otherwise the cursor's index addresses a shorter array.
	const unstackedData = useMemo(
		() =>
			stack === StackMode.None ? undefined : prepareAlignedData({ data, config }),
		[data, config, stack],
	);

	const legendComponent = useCallback(
		(averageLegendWidth: number): React.ReactNode => {
			if (!showLegend) {
				return null;
			}
			return (
				<UPlotLegend
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
				return customTooltip({ ...args, unstackedData });
			}
			return null;
		},
		[customTooltip, unstackedData],
	);

	const syncMetadata = useMemo(
		() => ({
			yAxisUnit,
			groupByPerQuery,
			filterMode: syncFilterMode,
		}),
		[yAxisUnit, groupByPerQuery, syncFilterMode],
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
						data={chartData}
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
								pinKey={pinKey}
								onClick={onClick}
								syncMode={syncMode}
								maxWidth={Math.max(
									TOOLTIP_MIN_WIDTH,
									averageLegendWidth + TOOLTIP_WIDTH_PADDING,
								)}
								syncKey={syncKey}
								syncMetadata={syncMetadata}
								render={renderTooltipCallback}
								pinnedTooltipElement={pinnedTooltipElement}
								portalRoot={tooltipPortalRoot}
							/>
						)}
					</UPlotChart>
				)}
			</ChartLayout>
		</PlotContextProvider>
	);
}
