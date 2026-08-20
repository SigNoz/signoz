import { useMemo } from 'react';
import cx from 'classnames';
import { calculateChartDimensions } from 'lib/visualization/charts/utils';
import { MAX_LEGEND_WIDTH } from 'lib/uPlotV2/components/Legend/Legend';
import { LegendConfig, LegendPosition } from 'lib/uPlotV2/components/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';

import 'lib/visualization/layout/ChartLayout/ChartLayout.styles.scss';

export interface ChartLayoutProps {
	showLegend?: boolean;
	legendComponent: (legendPerSet: number) => React.ReactNode;
	children: (props: {
		chartWidth: number;
		chartHeight: number;
		averageLegendWidth: number;
	}) => React.ReactNode;
	layoutChildren?: React.ReactNode;
	/**
	 * Rendered directly under the plot, inside the chart column — so it stays next to
	 * the axis with the legend below it, and beside a RIGHT legend rather than under
	 * it. `layoutChildren` sits below everything instead.
	 */
	contentFooter?: React.ReactNode;
	containerWidth: number;
	containerHeight: number;
	legendConfig: LegendConfig;
	config: UPlotConfigBuilder;
	/** Defaults to the chart's series labels. Pass them when the legend lists
	 *  something else, or the split is measured against the wrong text. */
	seriesLabels?: string[];
}
export default function ChartLayout({
	showLegend = true,
	legendComponent,
	children,
	layoutChildren,
	contentFooter,
	containerWidth,
	containerHeight,
	legendConfig,
	config,
	seriesLabels,
}: ChartLayoutProps): JSX.Element {
	const chartDimensions = useMemo(
		() => {
			if (!showLegend) {
				return {
					width: containerWidth,
					height: containerHeight,
					legendWidth: 0,
					legendHeight: 0,
					averageLegendWidth: MAX_LEGEND_WIDTH,
				};
			}
			const resolvedLabels =
				seriesLabels ??
				Object.values(config.getLegendItems())
					.map((item) => item.label)
					.filter((label): label is string => label !== undefined);
			return calculateChartDimensions({
				containerWidth,
				containerHeight,
				legendConfig,
				seriesLabels: resolvedLabels,
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[containerWidth, containerHeight, legendConfig, showLegend, seriesLabels],
	);

	return (
		<div className="chart-layout__container">
			<div
				className={cx('chart-layout', {
					'chart-layout--legend-right':
						legendConfig.position === LegendPosition.RIGHT,
					'chart-layout--with-layout-children': !!layoutChildren,
				})}
			>
				<div className="chart-layout__content">
					{children({
						chartWidth: chartDimensions.width,
						chartHeight: chartDimensions.height,
						averageLegendWidth: chartDimensions.averageLegendWidth,
					})}
					{contentFooter}
				</div>
				{showLegend && (
					<div
						className="chart-layout__legend-wrapper"
						style={{
							height: chartDimensions.legendHeight,
							width: chartDimensions.legendWidth,
						}}
					>
						{legendComponent(chartDimensions.averageLegendWidth)}
					</div>
				)}
			</div>
			{layoutChildren}
		</div>
	);
}
