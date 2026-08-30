import { useMemo, useRef } from 'react';
import { Color } from '@signozhq/design-tokens';
import { useTooltip, useTooltipInPortal } from '@visx/tooltip';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useResizeObserver } from 'hooks/useDimensions';

import { PanelWrapperProps } from './panelWrapper.types';
import {
	computeAxisScale,
	prepareScatterData,
	ScatterPoint,
} from './scatterUtils';
import { tooltipStyles } from './utils';

import './ScatterPanelWrapper.styles.scss';

const MARGIN = { top: 16, right: 24, bottom: 48, left: 64 };
const POINT_RADIUS = 4;

function ScatterPanelWrapper({
	queryResponse,
	widget,
}: PanelWrapperProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const graphRef = useRef<HTMLDivElement>(null);
	const { width, height } = useResizeObserver(graphRef);

	const {
		tooltipOpen,
		tooltipLeft,
		tooltipTop,
		tooltipData,
		showTooltip,
		hideTooltip,
	} = useTooltip<ScatterPoint>();
	const { containerRef, TooltipInPortal } = useTooltipInPortal({
		scroll: true,
		detectBounds: true,
	});

	const panelData = queryResponse.data?.payload?.data?.result;

	const { points, xQueryName, yQueryName } = useMemo(
		() =>
			prepareScatterData({
				panelData: panelData || [],
				customLegendColors: widget?.customLegendColors,
				isDarkMode,
				preferredXQuery: widget?.scatterXQuery,
				preferredYQuery: widget?.scatterYQuery,
			}),
		[
			panelData,
			widget?.customLegendColors,
			isDarkMode,
			widget?.scatterXQuery,
			widget?.scatterYQuery,
		],
	);

	const xScale = useMemo(
		() => computeAxisScale(points.map((p) => p.x)),
		[points],
	);
	const yScale = useMemo(
		() => computeAxisScale(points.map((p) => p.y)),
		[points],
	);

	const formatX = (value: number): string =>
		getYAxisFormattedValue(
			value.toString(),
			widget?.xAxisUnit || 'none',
			widget?.decimalPrecision,
		);
	const formatY = (value: number): string =>
		getYAxisFormattedValue(
			value.toString(),
			widget?.yAxisUnit || 'none',
			widget?.decimalPrecision,
		);

	if (!points.length) {
		return (
			<div className="scatter-no-data">
				Scatter plot needs two queries with matching group-by labels to pair X and Y
				values.
			</div>
		);
	}

	const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
	const plotHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);
	const axisColor = isDarkMode ? Color.BG_SLATE_200 : Color.BG_VANILLA_300;
	const labelColor = isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_400;

	const toPixelX = (value: number): number =>
		MARGIN.left + xScale.normalize(value) * plotWidth;
	const toPixelY = (value: number): number =>
		MARGIN.top + (1 - yScale.normalize(value)) * plotHeight;

	return (
		<div className="scatter-wrapper">
			<div className="scatter-container" ref={graphRef}>
				{width > 0 && height > 0 && (
					<svg width={width} height={height} ref={containerRef}>
						{/* Y axis ticks + gridlines */}
						{yScale.ticks.map((tick) => {
							const y = toPixelY(tick);
							return (
								<g key={`y-${tick}`}>
									<line
										x1={MARGIN.left}
										x2={width - MARGIN.right}
										y1={y}
										y2={y}
										stroke={axisColor}
										strokeWidth={0.5}
									/>
									<text
										x={MARGIN.left - 8}
										y={y}
										dy="0.32em"
										textAnchor="end"
										fontSize={10}
										fill={labelColor}
									>
										{formatY(tick)}
									</text>
								</g>
							);
						})}

						{/* X axis ticks + gridlines */}
						{xScale.ticks.map((tick) => {
							const x = toPixelX(tick);
							return (
								<g key={`x-${tick}`}>
									<line
										x1={x}
										x2={x}
										y1={MARGIN.top}
										y2={height - MARGIN.bottom}
										stroke={axisColor}
										strokeWidth={0.5}
									/>
									<text
										x={x}
										y={height - MARGIN.bottom + 16}
										textAnchor="middle"
										fontSize={10}
										fill={labelColor}
									>
										{formatX(tick)}
									</text>
								</g>
							);
						})}

						{/* Axis titles */}
						<text
							x={MARGIN.left + plotWidth / 2}
							y={height - 6}
							textAnchor="middle"
							fontSize={11}
							fontWeight="bold"
							fill={labelColor}
						>
							{xQueryName}
						</text>
						<text
							transform={`translate(14, ${MARGIN.top + plotHeight / 2}) rotate(-90)`}
							textAnchor="middle"
							fontSize={11}
							fontWeight="bold"
							fill={labelColor}
						>
							{yQueryName}
						</text>

						{/* Points */}
						{points.map((point) => (
							<circle
								key={`${point.label}-${point.x}-${point.y}`}
								cx={toPixelX(point.x)}
								cy={toPixelY(point.y)}
								r={POINT_RADIUS}
								fill={point.color}
								fillOpacity={0.85}
								stroke={point.color}
								onMouseEnter={(): void =>
									showTooltip({
										tooltipData: point,
										tooltipLeft: toPixelX(point.x),
										tooltipTop: toPixelY(point.y),
									})
								}
								onMouseLeave={hideTooltip}
							/>
						))}
					</svg>
				)}
				{tooltipOpen && tooltipData && (
					<TooltipInPortal
						top={tooltipTop}
						left={tooltipLeft}
						style={{
							...tooltipStyles,
							background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
							color: labelColor,
						}}
						className="scatter-tooltip"
					>
						<div
							className="scatter-indicator"
							style={{ background: tooltipData.color }}
						/>
						{tooltipData.label}
						<div className="scatter-tooltip-value">
							{xQueryName}: {formatX(tooltipData.x)}
						</div>
						<div className="scatter-tooltip-value">
							{yQueryName}: {formatY(tooltipData.y)}
						</div>
					</TooltipInPortal>
				)}
			</div>
			<div className="scatter-legend">
				{points.map((point) => (
					<div key={point.label} className="scatter-legend-item">
						<div
							className="scatter-legend-label"
							style={{ backgroundColor: point.color }}
						/>
						{point.label}
					</div>
				))}
			</div>
		</div>
	);
}

export default ScatterPanelWrapper;
