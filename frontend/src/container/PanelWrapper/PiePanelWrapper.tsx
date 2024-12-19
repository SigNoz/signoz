import './PiePanelWrapper.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Group } from '@visx/group';
import { Pie } from '@visx/shape';
import { useTooltip, useTooltipInPortal } from '@visx/tooltip';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { themeColors } from 'constants/theme';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { isNaN } from 'lodash-es';
import { useRef, useState } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { PanelWrapperProps, TooltipData } from './panelWrapper.types';
import { getLabel, lightenColor, tooltipStyles } from './utils';

// refernce: https://www.youtube.com/watch?v=bL3P9CqQkKw
function PiePanelWrapper({
	queryResponse,
	widget,
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

	const panelData =
		queryResponse.data?.payload?.data?.newResult?.data?.result || [];

	const isDarkMode = useIsDarkMode();

	let pieChartData: {
		label: string;
		value: string;
		color: string;
	}[] = [].concat(
		...(panelData
			.map((d) =>
				d.series?.map((s) => ({
					label:
						d.series?.length === 1
							? getLabel(Object.values(s.labels)[0], widget.query, d.queryName)
							: getLabel(Object.values(s.labels)[0], {} as Query, d.queryName, true),
					value: s.values[0].value,
					color: generateColor(
						d.series?.length === 1
							? getLabel(Object.values(s.labels)[0], widget.query, d.queryName)
							: getLabel(Object.values(s.labels)[0], {} as Query, d.queryName, true),
						isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
					),
				})),
			)
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
	const half = size / 2;

	const getFillColor = (color: string): string => {
		if (active === null) {
			return color;
		}
		const lightenedColor = lightenColor(color, 0.4); // Adjust the opacity value (0.7 in this case)
		return active.color === color ? color : lightenedColor;
	};

	return (
		<>
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
									outerRadius={({ data }): number => {
										if (!active) return half - 3;
										return data.label === active.label ? half : half - 3;
									}}
									padAngle={0.01}
									cornerRadius={3}
									width={size}
									height={size}
								>
									{
										// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
										(pie) =>
											pie.arcs.map((arc, index) => {
												const { label } = arc.data;
												const [centroidX, centroidY] = pie.path.centroid(arc);
												const hasSpaceForLabel = arc.endAngle - arc.startAngle >= 0.6;
												const arcPath = pie.path(arc);
												const arcFill = arc.data.color;
												return (
													<g
														// eslint-disable-next-line react/no-array-index-key
														key={`arc-${label}-${index}`}
														onMouseEnter={(): void => {
															showTooltip({
																tooltipData: {
																	label,
																	// do not update the unit in the data as the arc allotment is based on value
																	// and treats 4K smaller than 40
																	value: getYAxisFormattedValue(
																		arc.data.value,
																		widget?.yAxisUnit || 'none',
																	),
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
													>
														<path d={arcPath || ''} fill={getFillColor(arcFill)} />
														{hasSpaceForLabel && (
															<text
																x={centroidX}
																y={centroidY}
																dy=".33em"
																fill="#000"
																fontSize={10}
																textAnchor="middle"
																pointerEvents="none"
															>
																{arc.data.label}
															</text>
														)}
													</g>
												);
											})
									}
								</Pie>
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
						{pieChartData.length > 0 &&
							pieChartData.map((data) => (
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
		</>
	);
}

export default PiePanelWrapper;
