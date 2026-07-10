import { useRef } from 'react';
import { Color } from '@signozhq/design-tokens';
import { Group } from '@visx/group';
import { Pie as VisxPie } from '@visx/shape';
import { defaultStyles, useTooltip, useTooltipInPortal } from '@visx/tooltip';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { useResizeObserver } from 'hooks/useDimensions';
import Legend from 'lib/uPlotV2/components/Legend/Legend';
import { LegendPosition } from 'lib/uPlotV2/components/types';

import { PieChartProps, PieSlice } from '../types';
import { calculateChartDimensions } from '../utils';

import { usePieInteractions } from '../../hooks/usePieInteractions';
import PieArc from './PieArc';
import PieCenterLabel from './PieCenterLabel';
import styles from './Pie.module.scss';
import { PieTooltipData } from './types';
import { getDonutGeometry, getFillColor } from './utils';

/**
 * Donut chart rendered with @visx. Splits its area into chart + legend with the
 * same `calculateChartDimensions` logic as the uPlot charts (right column /
 * up-to-two bottom rows), renders the shared chart Legend, and delegates the
 * arcs, centre total and interaction state to PieArc / PieCenterLabel /
 * usePieInteractions. Pure presentation — slices are pre-resolved by the caller.
 */
export default function Pie({
	data,
	yAxisUnit,
	decimalPrecision,
	isDarkMode,
	position = LegendPosition.BOTTOM,
	id,
	onSliceClick,
	'data-testid': testId,
}: PieChartProps): JSX.Element {
	const {
		active,
		setActive,
		visibleData,
		legendItems,
		focusedSeriesIndex,
		onLegendClick,
		onLegendMouseMove,
		onLegendMouseLeave,
	} = usePieInteractions(data, id);

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

	const wrapperRef = useRef<HTMLDivElement>(null);
	const { width: containerWidth, height: containerHeight } =
		useResizeObserver(wrapperRef);

	// Reuse the uPlot chart/legend split so the donut + legend get the same area
	// allocation (right column, or up-to-two bottom rows) as every other panel.
	const { width, height, legendWidth, legendHeight, averageLegendWidth } =
		calculateChartDimensions({
			containerWidth,
			containerHeight,
			legendConfig: { position },
			seriesLabels: data.map((slice) => slice.label),
		});

	// Donut geometry derived from the allocated chart box, sized to leave room
	// for the external leader labels (see getDonutGeometry).
	const { size, radius, innerRadius } = getDonutGeometry(width, height);

	const totalValue = visibleData.reduce((sum, slice) => sum + slice.value, 0);

	const labelColor = isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_400;
	const activeColor = active?.color ?? null;

	const handleSliceEnter = (
		slice: PieSlice,
		centroidX: number,
		centroidY: number,
	): void => {
		showTooltip({
			tooltipData: {
				label: slice.label,
				value: getYAxisFormattedValue(
					slice.value.toString(),
					yAxisUnit || 'none',
					decimalPrecision,
				),
				color: slice.color,
			},
			tooltipTop: centroidY + height / 2,
			tooltipLeft: centroidX + width / 2,
		});
		setActive(slice);
	};

	const handleSliceLeave = (): void => {
		hideTooltip();
		setActive(null);
	};

	if (!data.length) {
		return (
			<div
				ref={wrapperRef}
				className={styles.pieChartWrapper}
				data-testid={testId}
			>
				<div className={styles.pieChartNoData}>No data</div>
			</div>
		);
	}

	const isRightLegend = position === LegendPosition.RIGHT;

	return (
		<div
			ref={wrapperRef}
			className={styles.pieChartWrapper}
			style={{ flexDirection: isRightLegend ? 'row' : 'column' }}
			data-testid={testId}
		>
			<div className={styles.pieChartContainer} style={{ width, height }}>
				{size > 0 && (
					<svg width={width} height={height} ref={containerRef}>
						<Group top={height / 2} left={width / 2}>
							<VisxPie
								data={visibleData}
								pieValue={(slice: PieSlice): number => slice.value}
								outerRadius={radius}
								innerRadius={innerRadius}
								padAngle={0.01}
								cornerRadius={3}
								width={size}
								height={size}
							>
								{(pie): JSX.Element[] =>
									pie.arcs.map((arc) => (
										<PieArc
											key={`arc-${arc.data.label}-${arc.data.value}-${arc.startAngle.toFixed(
												6,
											)}`}
											slice={arc.data}
											arcPath={pie.path(arc) || ''}
											centroid={pie.path.centroid(arc)}
											startAngle={arc.startAngle}
											endAngle={arc.endAngle}
											radius={radius}
											totalValue={totalValue}
											yAxisUnit={yAxisUnit}
											decimalPrecision={decimalPrecision}
											labelColor={labelColor}
											fill={getFillColor(arc.data.color, activeColor)}
											onEnter={handleSliceEnter}
											onLeave={handleSliceLeave}
											onClick={onSliceClick}
										/>
									))
								}
							</VisxPie>
							<PieCenterLabel
								total={totalValue}
								yAxisUnit={yAxisUnit}
								decimalPrecision={decimalPrecision}
								radius={radius}
								innerRadius={innerRadius}
								color={labelColor}
							/>
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
						<div className={styles.pieChartTooltipContent}>
							<span>{tooltipData.label}</span>
							<span className={styles.pieChartTooltipValue}>{tooltipData.value}</span>
						</div>
					</TooltipInPortal>
				)}
			</div>
			<div
				className={styles.pieChartLegend}
				style={{
					width: legendWidth,
					height: legendHeight,
				}}
			>
				<Legend
					items={legendItems}
					position={position}
					averageLegendWidth={averageLegendWidth}
					focusedSeriesIndex={focusedSeriesIndex}
					onClick={onLegendClick}
					onMouseMove={onLegendMouseMove}
					onMouseLeave={onLegendMouseLeave}
				/>
			</div>
		</div>
	);
}
