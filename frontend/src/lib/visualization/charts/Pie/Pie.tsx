import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type MouseEvent as ReactMouseEvent,
} from 'react';
import { Color } from '@signozhq/design-tokens';
import { Group } from '@visx/group';
import { Pie as VisxPie } from '@visx/shape';
import { useTooltip, useTooltipInPortal } from '@visx/tooltip';
import cx from 'classnames';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { useResizeObserver } from 'hooks/useDimensions';
import Legend from 'lib/uPlotV2/components/Legend/Legend';
import { LegendPosition } from 'lib/uPlotV2/components/types';
import { LegendItem } from 'lib/uPlotV2/config/types';

import { PieChartProps, PieSlice } from 'lib/visualization/charts/types';
import { calculateChartDimensions } from 'lib/visualization/charts/utils';

import { useLegendVisibility } from 'lib/visualization/hooks/useLegendVisibility';
import PieArc from 'lib/visualization/charts/Pie/PieArc';
import { groupPieSlices } from 'lib/visualization/charts/Pie/groupPieSlices';
import PieCenterLabel from 'lib/visualization/charts/Pie/PieCenterLabel';
import PieTooltipContent from 'lib/visualization/charts/Pie/PieTooltipContent';
import styles from 'lib/visualization/charts/Pie/Pie.module.scss';
import { PieTooltipData } from 'lib/visualization/charts/Pie/types';
import {
	getDonutGeometry,
	compareSlices,
	getFillColor,
	getSliceDisplayLabel,
} from 'lib/visualization/charts/Pie/utils';

// Keeps the cursor off the tooltip so it never steals the hover.
const TOOLTIP_CURSOR_OFFSET = 12;

/**
 * Donut chart rendered with @visx. Splits its area into chart + legend with the
 * same `calculateChartDimensions` logic as the uPlot charts (right column /
 * up-to-two bottom rows), renders the shared chart Legend, and delegates the
 * arcs and centre total to PieArc / PieCenterLabel. Pure presentation — slices
 * are pre-resolved by the caller.
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
	const labels = useMemo(() => data.map((slice) => slice.label), [data]);

	const { hiddenKeys, focusedSeriesIndex, setFocusedKey, onLegendAction } =
		useLegendVisibility({ keys: labels, id });

	const legendItems = useMemo<LegendItem[]>(
		() =>
			data.map((slice, index) => ({
				seriesIndex: index,
				label: slice.label,
				color: slice.color,
				show: !hiddenKeys.has(slice.label),
			})),
		[data, hiddenKeys],
	);

	// Hidden slices drop out before grouping, so Other and the centre total recompute.
	const visibleData = useMemo(
		() =>
			groupPieSlices(
				data.filter((slice) => !hiddenKeys.has(slice.label)),
				isDarkMode,
			),
		[data, hiddenKeys, isDarkMode],
	);

	// A series folded into Other highlights the Other arc.
	const drawnColorByLabel = useMemo(
		() =>
			new Map(
				visibleData.flatMap((slice) =>
					[slice, ...(slice.members ?? [])].map((entry): [string, string] => [
						entry.label,
						slice.color,
					]),
				),
			),
		[visibleData],
	);

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
	const {
		width,
		height,
		legendWidth,
		legendHeight,
		averageLegendWidth,
		showLegendSearch,
	} = useMemo(
		() =>
			calculateChartDimensions({
				containerWidth,
				containerHeight,
				legendConfig: { position },
				seriesLabels: labels,
			}),
		[containerWidth, containerHeight, position, labels],
	);

	// Donut geometry derived from the allocated chart box, sized to leave room
	// for the external leader labels (see getDonutGeometry).
	const { size, radius, innerRadius } = useMemo(
		() => getDonutGeometry(width, height),
		[width, height],
	);

	const totalValue = useMemo(
		() => visibleData.reduce((sum, slice) => sum + slice.value, 0),
		[visibleData],
	);

	const labelColor = isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_400;
	const hoveredColor = tooltipOpen ? tooltipData?.slice.color : undefined;
	const activeColor =
		hoveredColor ??
		(focusedSeriesIndex !== null
			? (drawnColorByLabel.get(labels[focusedSeriesIndex]) ?? null)
			: null);

	const formatValue = useCallback(
		(value: number): string =>
			getYAxisFormattedValue(
				value.toString(),
				yAxisUnit || 'none',
				decimalPrecision,
			),
		[yAxisUnit, decimalPrecision],
	);

	// A grouped slice's click pins its tooltip so its members can be drilled into.
	const [pinnedSlice, setPinnedSlice] = useState<PieSlice | null>(null);

	const unpin = useCallback((): void => {
		setPinnedSlice(null);
		hideTooltip();
		setFocusedKey(null);
	}, [hideTooltip, setFocusedKey]);

	useEffect(() => {
		setPinnedSlice(null);
	}, [visibleData]);

	useEffect(() => {
		if (!pinnedSlice) {
			return undefined;
		}
		const onPointerDown = (event: PointerEvent): void => {
			const target = event.target as Element | null;
			// Arc clicks resolve the pin themselves (see handleSliceClick).
			if (target?.closest('[data-pie-tooltip], [data-pie-arc]')) {
				return;
			}
			unpin();
		};
		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.key === 'Escape') {
				unpin();
			}
		};
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);
		return (): void => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [pinnedSlice, unpin]);

	// Built once per data change, not on every mouse move.
	const tooltipDataBySlice = useMemo(
		() =>
			new Map<PieSlice, PieTooltipData>(
				visibleData.map((slice) => [
					slice,
					{
						slice: {
							label: getSliceDisplayLabel(slice),
							value: slice.value,
							tooltipValue: formatValue(slice.value),
							color: slice.color,
							isActive: true,
						},
						members: slice.members?.map((member) => ({
							label: member.label,
							value: member.value,
							tooltipValue: formatValue(member.value),
							color: member.color,
							isActive: false,
						})),
					},
				]),
			),
		[visibleData, formatValue],
	);

	const handleSliceHover = useCallback(
		(slice: PieSlice, event: ReactMouseEvent<SVGGElement>): void => {
			if (pinnedSlice) {
				return;
			}
			const svgRect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
			showTooltip({
				tooltipData: tooltipDataBySlice.get(slice),
				tooltipTop: event.clientY - (svgRect?.top ?? 0) + TOOLTIP_CURSOR_OFFSET,
				tooltipLeft: event.clientX - (svgRect?.left ?? 0) + TOOLTIP_CURSOR_OFFSET,
			});
			setFocusedKey(slice.label);
		},
		[pinnedSlice, showTooltip, setFocusedKey, tooltipDataBySlice],
	);

	const handleSliceLeave = useCallback((): void => {
		if (pinnedSlice) {
			return;
		}
		hideTooltip();
		setFocusedKey(null);
	}, [pinnedSlice, hideTooltip, setFocusedKey]);

	const handleSliceClick = useCallback(
		(slice: PieSlice, event: ReactMouseEvent): void => {
			if (slice.members) {
				if (pinnedSlice === slice) {
					unpin();
				} else {
					setPinnedSlice(slice);
				}
				return;
			}
			if (pinnedSlice) {
				unpin();
			}
			onSliceClick?.(slice, { x: event.clientX, y: event.clientY });
		},
		[pinnedSlice, unpin, onSliceClick],
	);

	const handleMemberClick = useCallback(
		(index: number, event: ReactMouseEvent): void => {
			const member = pinnedSlice?.members?.[index];
			const tooltipRect = (event.currentTarget as Element)
				.closest('[data-pie-tooltip]')
				?.getBoundingClientRect();
			unpin();
			if (member) {
				onSliceClick?.(member, {
					x: tooltipRect?.left ?? event.clientX,
					y: tooltipRect?.top ?? event.clientY,
				});
			}
		},
		[pinnedSlice, unpin, onSliceClick],
	);

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
								pieSort={compareSlices}
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
											onHover={handleSliceHover}
											onLeave={handleSliceLeave}
											onClick={handleSliceClick}
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
						unstyled
						applyPositionStyle
						style={{ pointerEvents: pinnedSlice ? 'auto' : 'none' }}
						data-pie-tooltip=""
					>
						<PieTooltipContent
							id={id ?? ''}
							data={tooltipData}
							isPinned={!!pinnedSlice}
							canDrilldown={!!onSliceClick}
							onMemberClick={handleMemberClick}
							onUnpin={unpin}
						/>
					</TooltipInPortal>
				)}
			</div>
			<div
				className={cx(styles.pieChartLegend, {
					[styles.pieChartLegendRight]: isRightLegend,
				})}
				style={{
					width: legendWidth,
					height: legendHeight,
				}}
			>
				<Legend
					items={legendItems}
					position={position}
					averageLegendWidth={averageLegendWidth}
					showSearch={showLegendSearch}
					focusedSeriesIndex={focusedSeriesIndex}
					onAction={onLegendAction}
				/>
			</div>
		</div>
	);
}
