import './PiePanelWrapper.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Group } from '@visx/group';
import { Pie } from '@visx/shape';
import { useTooltip, useTooltipInPortal } from '@visx/tooltip';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { themeColors } from 'constants/theme';
import { getPieChartClickData } from 'container/QueryTable/Drilldown/drilldownUtils';
import useGraphContextMenu from 'container/QueryTable/Drilldown/useGraphContextMenu';
import { useIsDarkMode } from 'hooks/useDarkMode';
import getLabelName from 'lib/getLabelName';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { isNaN } from 'lodash-es';
import ContextMenu, { useCoordinates } from 'periscope/components/ContextMenu';
import { useRef, useState } from 'react';

import { PanelWrapperProps, TooltipData } from './panelWrapper.types';
import { lightenColor, tooltipStyles } from './utils';

// reference: https://www.youtube.com/watch?v=bL3P9CqQkKw
function PiePanelWrapper({
	queryResponse,
	widget,
	enableDrillDown = false,
}: PanelWrapperProps): JSX.Element {
	const [active, setActive] = useState<{
		label: string;
		value: string;
		color: string;
	} | null>(null);

	const {
		tooltipOpen,
		tooltipLeft,
		tooltipTop,
		tooltipData,
		hideTooltip,
		showTooltip,
	} = useTooltip<TooltipData>();

	const { containerRef, TooltipInPortal } = useTooltipInPortal({
		scroll: true,
		detectBounds: true,
	});

	const panelData = queryResponse.data?.payload?.data?.result || [];

	const isDarkMode = useIsDarkMode();

	let pieChartData: {
		label: string;
		value: string;
		color: string;
		record: any;
	}[] = [].concat(
		...(panelData
			.map((d) => {
				const label = getLabelName(d.metric, d.queryName || '', d.legend || '');
				return {
					label,
					value: d?.values?.[0]?.[1],
					record: d,
					color:
						widget?.customLegendColors?.[label] ||
						generateColor(
							label,
							isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
						),
				};
			})
			.filter((d) => d !== undefined) as never[]),
	);

	pieChartData = pieChartData.filter(
		(arc) =>
			arc.value && !isNaN(parseFloat(arc.value)) && parseFloat(arc.value) > 0,
	);

	let size = 0;
	let width = 0;
	let height = 0;

	const chartRef = useRef<HTMLDivElement>(null);
	if (chartRef.current) {
		const { offsetWidth, offsetHeight } = chartRef.current;
		size = Math.min(offsetWidth, offsetHeight);
		width = offsetWidth;
		height = offsetHeight;
	}

	// Adjust the size to leave room for external labels
	const radius = size * 0.35;
	// Add inner radius for donut chart
	const innerRadius = radius * 0.6;

	// Calculate total value for center display
	const totalValue = pieChartData.reduce(
		(sum, data) => sum + parseFloat(data.value || '0'),
		0,
	);

	// Format total for display with the same unit as segments
	const formattedTotal = getYAxisFormattedValue(
		totalValue.toString(),
		widget?.yAxisUnit || 'none',
		widget?.decimalPrecision,
	);

	// Extract numeric part and unit separately for styling
	const matches = formattedTotal.match(/([\d.]+[KMB]?)(.*)$/);
	const numericTotal = matches?.[1] || formattedTotal;
	const unitTotal = matches?.[2]?.trim() || '';

	// Dynamically calculate font size based on text length to prevent overflow
	const getScaledFontSize = ({
		text,
		baseSize,
		innerRadius,
	}: {
		text: string;
		baseSize: number;
		innerRadius: number;
	}): number => {
		if (!text) return baseSize;

		const { length } = text;
		// More aggressive scaling for very long numbers
		const scaleFactor = Math.max(0.3, 1 - (length - 3) * 0.09);

		// Ensure text fits in the inner circle (roughly)
		const maxSize = innerRadius * 0.9; // Don't use more than 90% of inner radius

		return Math.min(baseSize * scaleFactor, maxSize);
	};

	const numericFontSize = getScaledFontSize({
		text: numericTotal,
		baseSize: radius * 0.3,
		innerRadius,
	});
	const unitFontSize = numericFontSize * 0.5; // Unit size is half of numeric size

	const getFillColor = (color: string): string => {
		if (active === null) {
			return color;
		}
		const lightenedColor = lightenColor(color, 0.4); // Adjust the opacity value (0.4 in this case)
		return active.color === color ? color : lightenedColor;
	};

	const {
		coordinates,
		popoverPosition,
		clickedData,
		onClose,
		onClick,
		subMenu,
		setSubMenu,
	} = useCoordinates();

	const { menuItemsConfig } = useGraphContextMenu({
		widgetId: widget.id || '',
		query: widget.query,
		graphData: clickedData,
		onClose,
		coordinates,
		subMenu,
		setSubMenu,
		contextLinks: widget.contextLinks,
		panelType: widget.panelTypes,
		queryRange: queryResponse,
	});

	return (
		<div className="piechart-wrapper">
			{!pieChartData.length && <div className="piechart-no-data">No data</div>}
			{pieChartData.length > 0 && (
				<>
					<div className="piechart-container" ref={chartRef}>
						<svg width={width} height={height} ref={containerRef}>
							<Group top={height / 2} left={width / 2}>
								<Pie
									data={pieChartData}
									pieValue={(data: {
										label: string;
										value: string;
										color: string;
									}): number => parseFloat(data.value)}
									outerRadius={radius}
									innerRadius={innerRadius}
									padAngle={0.01}
									cornerRadius={3}
									width={size}
									height={size}
								>
									{
										// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, sonarjs/cognitive-complexity
										(pie) =>
											pie.arcs.map((arc) => {
												const { label } = arc.data;
												const [centroidX, centroidY] = pie.path.centroid(arc);
												const arcPath = pie.path(arc);
												const arcFill = arc.data.color;

												// Calculate angle bisector for the arc (midpoint of the arc)
												const angle = (arc.startAngle + arc.endAngle) / 2;

												// Calculate outer point for the label
												const labelRadius = radius * 1.3; // Label position
												const labelX = Math.sin(angle) * labelRadius;
												const labelY = -Math.cos(angle) * labelRadius;

												// Calculate endpoint for the connecting line
												const lineEndRadius = radius * 1.1;
												const lineEndX = Math.sin(angle) * lineEndRadius;
												const lineEndY = -Math.cos(angle) * lineEndRadius;

												// Format the value for display
												const displayValue = getYAxisFormattedValue(
													arc.data.value,
													widget?.yAxisUnit || 'none',
													widget?.decimalPrecision,
												);

												// Determine text anchor based on position in the circle
												const textAnchor = Math.sin(angle) > 0 ? 'start' : 'end';

												// Shorten label if too long
												const shortenedLabel =
													label.length > 15 ? `${label.substring(0, 12)}...` : label;

												const shouldShowLabel =
													parseFloat(arc.data.value) /
														pieChartData.reduce((sum, d) => sum + parseFloat(d.value), 0) >
													0.03;

												return (
													<g
														key={`arc-${label}-${arc.data.value}-${arc.startAngle.toFixed(
															6,
														)}`}
														onMouseEnter={(): void => {
															showTooltip({
																tooltipData: {
																	label,
																	value: displayValue,
																	color: arc.data.color,
																	key: label,
																},
																tooltipTop: centroidY + height / 2,
																tooltipLeft: centroidX + width / 2,
															});
															setActive(arc.data);
														}}
														onMouseLeave={(): void => {
															hideTooltip();
															setActive(null);
														}}
														onClick={(e): void => {
															if (enableDrillDown) {
																const data = getPieChartClickData(arc);
																if (data && data?.queryName) {
																	onClick(
																		{ x: e.clientX, y: e.clientY },
																		{ ...data, label: data.label },
																	);
																}
															}
														}}
													>
														<path d={arcPath || ''} fill={getFillColor(arcFill)} />

														{shouldShowLabel && (
															<>
																{/* Connecting line */}
																<line
																	x1={centroidX}
																	y1={centroidY}
																	x2={lineEndX}
																	y2={lineEndY}
																	stroke={isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_400}
																	strokeWidth={1}
																/>

																{/* Line from arc edge to label */}
																<line
																	x1={lineEndX}
																	y1={lineEndY}
																	x2={labelX}
																	y2={labelY}
																	stroke={isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_400}
																	strokeWidth={1}
																/>

																{/* Label text */}
																<text
																	x={labelX}
																	y={labelY - 8}
																	dy=".33em"
																	fill={isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_400}
																	fontSize={10}
																	textAnchor={textAnchor}
																	pointerEvents="none"
																>
																	{shortenedLabel}
																</text>

																{/* Value text */}
																<text
																	x={labelX}
																	y={labelY + 8}
																	dy=".33em"
																	fill={isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_400}
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
								</Pie>
								<ContextMenu
									coordinates={coordinates}
									popoverPosition={popoverPosition}
									title={menuItemsConfig.header as string}
									items={menuItemsConfig.items}
									onClose={onClose}
								/>

								{/* Add total value in the center */}
								<text
									textAnchor="middle"
									dominantBaseline="central"
									fill={isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_400}
								>
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
						{tooltipOpen && tooltipData && (
							<TooltipInPortal
								top={tooltipTop}
								left={tooltipLeft}
								style={{
									...tooltipStyles,
									background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
									color: isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_400,
								}}
								className="piechart-tooltip"
							>
								<div
									style={{
										background: tooltipData.color,
									}}
									className="piechart-indicator"
								/>
								{tooltipData.key}
								<div className="tooltip-value">{tooltipData.value}</div>
							</TooltipInPortal>
						)}
					</div>
					<div className="piechart-legend">
						{pieChartData.map((data) => (
							<div
								key={data.label}
								className="piechart-legend-item"
								onMouseEnter={(): void => {
									setActive(data);
								}}
								onMouseLeave={(): void => {
									setActive(null);
								}}
							>
								<div
									style={{
										backgroundColor: getFillColor(data.color),
									}}
									className="piechart-legend-label"
								/>
								{data.label}
							</div>
						))}
					</div>
				</>
			)}
		</div>
	);
}

export default PiePanelWrapper;
