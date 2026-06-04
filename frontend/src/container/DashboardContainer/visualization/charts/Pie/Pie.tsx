import { useRef, useState } from 'react';
import { Color } from '@signozhq/design-tokens';
import { Group } from '@visx/group';
import { Pie as VisxPie } from '@visx/shape';
import { defaultStyles, useTooltip, useTooltipInPortal } from '@visx/tooltip';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { useResizeObserver } from 'hooks/useDimensions';

import { PieChartProps, PieSlice } from '../types';

import styles from './Pie.module.scss';
import { getArcGeometry, getFillColor, getScaledFontSize } from './utils';

// Slices below this share of the total don't get a leader label (too cramped).
const MIN_LABEL_SHARE = 0.03;
const MAX_LABEL_LENGTH = 15;

interface PieTooltipData {
	label: string;
	value: string;
	color: string;
}

/**
 * Donut chart rendered with @visx. Self-measures its draw area, lays out the
 * arcs, leader labels and a centre total, and renders an interactive legend
 * below. Hovering a slice shows a visx tooltip following the cursor. Pure
 * presentation — slices are pre-resolved by the caller, and a click surfaces
 * the slice via `onSliceClick`.
 */
export default function Pie({
	data,
	yAxisUnit,
	decimalPrecision,
	isDarkMode,
	onSliceClick,
	'data-testid': testId,
}: PieChartProps): JSX.Element {
	const [active, setActive] = useState<PieSlice | null>(null);

	const {
		tooltipOpen,
		tooltipLeft,
		tooltipTop,
		tooltipData,
		hideTooltip,
		showTooltip,
	} = useTooltip<PieTooltipData>();

	const { containerRef, TooltipInPortal } = useTooltipInPortal({
		scroll: true,
		detectBounds: true,
	});

	const chartRef = useRef<HTMLDivElement>(null);
	const { width, height } = useResizeObserver(chartRef);

	const size = Math.min(width, height);
	const radius = size * 0.35;
	const innerRadius = radius * 0.6;

	const totalValue = data.reduce((sum, slice) => sum + slice.value, 0);

	const formattedTotal = getYAxisFormattedValue(
		totalValue.toString(),
		yAxisUnit || 'none',
		decimalPrecision,
	);
	// Split the formatted total into its numeric part and unit so each can be
	// sized independently in the donut hole.
	const matches = formattedTotal.match(/([\d.]+[KMB]?)(.*)$/);
	const numericTotal = matches?.[1] || formattedTotal;
	const unitTotal = matches?.[2]?.trim() || '';
	const numericFontSize = getScaledFontSize({
		text: numericTotal,
		baseSize: radius * 0.3,
		innerRadius,
	});
	const unitFontSize = numericFontSize * 0.5;

	const labelColor = isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_400;
	const activeColor = active?.color ?? null;

	if (!data.length) {
		return (
			<div className={styles.pieChartWrapper} data-testid={testId}>
				<div className={styles.pieChartNoData}>No data</div>
			</div>
		);
	}

	return (
		<div className={styles.pieChartWrapper} data-testid={testId}>
			<div className={styles.pieChartContainer} ref={chartRef}>
				{size > 0 && (
					<svg width={width} height={height} ref={containerRef}>
						<Group top={height / 2} left={width / 2}>
							<VisxPie
								data={data}
								pieValue={(slice: PieSlice): number => slice.value}
								outerRadius={radius}
								innerRadius={innerRadius}
								padAngle={0.01}
								cornerRadius={3}
								width={size}
								height={size}
							>
								{(pie): JSX.Element[] =>
									pie.arcs.map((arc) => {
										const { label, value, color } = arc.data;
										const [centroidX, centroidY] = pie.path.centroid(arc);
										const { labelX, labelY, lineEndX, lineEndY, textAnchor } =
											getArcGeometry(arc.startAngle, arc.endAngle, radius);

										const displayValue = getYAxisFormattedValue(
											value.toString(),
											yAxisUnit || 'none',
											decimalPrecision,
										);
										const shortenedLabel =
											label.length > MAX_LABEL_LENGTH
												? `${label.substring(0, 12)}...`
												: label;
										const shouldShowLabel = value / totalValue > MIN_LABEL_SHARE;

										return (
											<g
												key={`arc-${label}-${value}-${arc.startAngle.toFixed(6)}`}
												onMouseEnter={(): void => {
													showTooltip({
														tooltipData: { label, value: displayValue, color },
														tooltipTop: centroidY + height / 2,
														tooltipLeft: centroidX + width / 2,
													});
													setActive(arc.data);
												}}
												onMouseLeave={(): void => {
													hideTooltip();
													setActive(null);
												}}
												onClick={(): void => onSliceClick?.(arc.data)}
											>
												<path
													d={pie.path(arc) || ''}
													fill={getFillColor(color, activeColor)}
												/>
												{shouldShowLabel && (
													<>
														<line
															x1={centroidX}
															y1={centroidY}
															x2={lineEndX}
															y2={lineEndY}
															stroke={labelColor}
															strokeWidth={1}
														/>
														<line
															x1={lineEndX}
															y1={lineEndY}
															x2={labelX}
															y2={labelY}
															stroke={labelColor}
															strokeWidth={1}
														/>
														<text
															x={labelX}
															y={labelY - 8}
															dy=".33em"
															fill={labelColor}
															fontSize={10}
															textAnchor={textAnchor}
															pointerEvents="none"
														>
															{shortenedLabel}
														</text>
														<text
															x={labelX}
															y={labelY + 8}
															dy=".33em"
															fill={labelColor}
															fontSize={10}
															fontWeight="bold"
															textAnchor={textAnchor}
															pointerEvents="none"
														>
															{displayValue}
														</text>
													</>
												)}
											</g>
										);
									})
								}
							</VisxPie>
							<text textAnchor="middle" dominantBaseline="central" fill={labelColor}>
								<tspan fontSize={numericFontSize} fontWeight="bold">
									{numericTotal}
								</tspan>
								{unitTotal && (
									<tspan fontSize={unitFontSize} opacity={0.9} dx={2}>
										{unitTotal}
									</tspan>
								)}
							</text>
						</Group>
					</svg>
				)}
				{tooltipOpen && tooltipData && (
					<TooltipInPortal
						top={tooltipTop}
						left={tooltipLeft}
						className={styles.pieChartTooltip}
						style={{
							...defaultStyles,
							color: labelColor,
						}}
					>
						<div
							className={styles.pieChartIndicator}
							style={{ background: tooltipData.color }}
						/>
						<div className={styles.pieTooltipContent}>
							<span>{tooltipData.label}</span>
							<span className={styles.tooltipValue}>{tooltipData.value}</span>
						</div>
					</TooltipInPortal>
				)}
			</div>
			<div className={styles.pieChartLegend}>
				{data.map((slice) => (
					<div
						key={slice.label}
						className={styles.pieChartLegendItem}
						onMouseEnter={(): void => setActive(slice)}
						onMouseLeave={(): void => setActive(null)}
					>
						<div
							className={styles.pieChartLegendLabel}
							style={{ backgroundColor: getFillColor(slice.color, activeColor) }}
						/>
						{slice.label}
					</div>
				))}
			</div>
		</div>
	);
}
