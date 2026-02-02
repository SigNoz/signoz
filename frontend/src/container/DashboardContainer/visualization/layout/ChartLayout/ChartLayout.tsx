import { useMemo } from 'react';
import cx from 'classnames';
import { calculateChartDimensions } from 'container/DashboardContainer/visualization/charts/utils';
import { LegendConfig, LegendPosition } from 'lib/uPlotV2/components/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';

import './ChartLayout.styles.scss';

export interface ChartLayoutProps {
	legendComponent: (legendPerSet: number) => React.ReactNode;
	children: (props: {
		chartWidth: number;
		chartHeight: number;
	}) => React.ReactNode;
	layoutChildren?: React.ReactNode;
	containerWidth: number;
	containerHeight: number;
	legendConfig: LegendConfig;
	config: UPlotConfigBuilder;
}
export default function ChartLayout({
	legendComponent,
	children,
	layoutChildren,
	containerWidth,
	containerHeight,
	legendConfig,
	config,
}: ChartLayoutProps): JSX.Element {
	const chartDimensions = useMemo(
		() => {
			const legendItemsMap = config.getLegendItems();
			const seriesLabels = Object.values(legendItemsMap)
				.map((item) => item.label)
				.filter((label): label is string => label !== undefined);
			return calculateChartDimensions({
				containerWidth,
				containerHeight,
				legendConfig,
				seriesLabels,
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[containerWidth, containerHeight, legendConfig],
	);

	return (
		<div className="chart-layout__container">
			<div
				className={cx('chart-layout', {
					'chart-layout--legend-right':
						legendConfig.position === LegendPosition.RIGHT,
				})}
			>
				<div className="chart-layout__content">
					{children({
						chartWidth: chartDimensions.width,
						chartHeight: chartDimensions.height,
					})}
				</div>
				<div
					className="chart-layout__legend-wrapper"
					style={{
						height: chartDimensions.legendHeight,
						width: chartDimensions.legendWidth,
					}}
				>
					{legendComponent(chartDimensions.legendsPerSet)}
				</div>
			</div>
			{layoutChildren}
		</div>
	);
}
