import './StateTimelinePanel.styles.scss';

import { memo, MouseEvent, useCallback, useState } from 'react';
import { DashboardtypesLegendPositionDTO } from 'api/generated/services/sigNoz.schemas';
import { useTimezone } from 'providers/Timezone';
import { Virtuoso } from 'react-virtuoso';

import LabelColumn from './LabelColumn';
import StateTimelineTooltip from './StateTimelineTooltip';
import SwimLaneRow from './SwimLaneRow';
import TimeAxis from './TimeAxis';
import type { SegmentData, SwimLaneModel, SwimLaneRowData } from './types';

const TIME_AXIS_HEIGHT = 30;
const MIN_ROW_HEIGHT = 36;
const LABEL_COLUMN_MAX_WIDTH = 200;
const MAX_ROWS_WARNING = 100;
/** Minimum drag distance (px) that counts as a zoom selection. */
const MIN_DRAG_PX = 5;

export interface StateTimelinePanelProps {
	swimLaneModel: SwimLaneModel;
	width: number;
	height: number;
	isDarkMode: boolean;
	legendPosition: DashboardtypesLegendPositionDTO;
	onDragSelect?: (startTimeMs: number, endTimeMs: number) => void;
}

interface TooltipState {
	visible: boolean;
	x: number;
	y: number;
	segment: SegmentData | null;
	rowLabel: string;
}

interface DragState {
	isDragging: boolean;
	startX: number;
	currentX: number;
}

const IDLE_DRAG: DragState = { isDragging: false, startX: 0, currentX: 0 };

/** Row height: `max(floor(availableHeight / rowCount), MIN_ROW_HEIGHT)`. */
export function computeRowHeight(
	availableHeight: number,
	rowCount: number,
): number {
	if (rowCount <= 0) {
		return MIN_ROW_HEIGHT;
	}
	return Math.max(Math.floor(availableHeight / rowCount), MIN_ROW_HEIGHT);
}

function StateTimelinePanel({
	swimLaneModel,
	width,
	height,
	isDarkMode,
	legendPosition,
	onDragSelect,
}: StateTimelinePanelProps): JSX.Element {
	const { timezone } = useTimezone();
	const [tooltipState, setTooltipState] = useState<TooltipState>({
		visible: false,
		x: 0,
		y: 0,
		segment: null,
		rowLabel: '',
	});
	const [scrollTop, setScrollTop] = useState(0);
	const [dragState, setDragState] = useState<DragState>(IDLE_DRAG);

	const { rows, timeRange } = swimLaneModel;
	const rowCount = rows.length;

	const availableHeight = height - TIME_AXIS_HEIGHT;
	const rowHeight = computeRowHeight(availableHeight, rowCount);

	const showLabelColumn =
		legendPosition !== DashboardtypesLegendPositionDTO.right;
	const labels = rows.map((row) => row.label);
	const labelColumnWidth = showLabelColumn
		? Math.min(LABEL_COLUMN_MAX_WIDTH, width * 0.3)
		: 0;
	const swimLaneWidth = Math.max(width - labelColumnWidth, 50);

	const handleSegmentHover = useCallback(
		(segment: SegmentData, event: MouseEvent, rowLabel: string): void => {
			const target = event.currentTarget as HTMLElement;
			const panelRect = target.closest('[data-testid="state-timeline-panel"]');
			const rect = panelRect?.getBoundingClientRect();
			setTooltipState({
				visible: true,
				x: rect ? event.clientX - rect.left : event.clientX,
				y: rect ? event.clientY - rect.top : event.clientY,
				segment,
				rowLabel,
			});
		},
		[],
	);

	const handleSegmentLeave = useCallback((): void => {
		setTooltipState((prev) => ({ ...prev, visible: false }));
	}, []);

	const handleVirtuosoScroll = useCallback(
		(event: React.UIEvent<HTMLDivElement>): void => {
			setScrollTop(event.currentTarget.scrollTop);
		},
		[],
	);

	const handleDragStart = useCallback(
		(event: MouseEvent<HTMLDivElement>): void => {
			if (!onDragSelect) {
				return;
			}
			const rect = event.currentTarget.getBoundingClientRect();
			const x = event.clientX - rect.left;
			setDragState({ isDragging: true, startX: x, currentX: x });
		},
		[onDragSelect],
	);

	const handleDragMove = useCallback(
		(event: MouseEvent<HTMLDivElement>): void => {
			setDragState((prev) => {
				if (!prev.isDragging) {
					return prev;
				}
				const rect = event.currentTarget.getBoundingClientRect();
				return { ...prev, currentX: event.clientX - rect.left };
			});
		},
		[],
	);

	const handleDragEnd = useCallback((): void => {
		if (!dragState.isDragging || !onDragSelect) {
			setDragState(IDLE_DRAG);
			return;
		}
		const totalDuration = timeRange.end - timeRange.start;
		const left = Math.min(dragState.startX, dragState.currentX);
		const right = Math.max(dragState.startX, dragState.currentX);
		if (right - left > MIN_DRAG_PX) {
			const startTime = timeRange.start + (left / swimLaneWidth) * totalDuration;
			const endTime = timeRange.start + (right / swimLaneWidth) * totalDuration;
			// timeRange is in seconds; drilldown consumers expect ms.
			onDragSelect(startTime * 1000, endTime * 1000);
		}
		setDragState(IDLE_DRAG);
	}, [dragState, onDragSelect, swimLaneWidth, timeRange]);

	const handleDragLeave = useCallback((): void => {
		setDragState((prev) => (prev.isDragging ? IDLE_DRAG : prev));
	}, []);

	const themeClass = isDarkMode
		? 'state-timeline-panel--dark'
		: 'state-timeline-panel--light';

	if (rowCount === 0) {
		return (
			<div
				className={`state-timeline-panel ${themeClass}`}
				style={{ width, height }}
				data-testid="state-timeline-panel"
			>
				<div
					className="state-timeline-panel__no-data"
					data-testid="state-timeline-no-data"
				>
					No Data
				</div>
			</div>
		);
	}

	const showDragOverlay =
		dragState.isDragging && Math.abs(dragState.currentX - dragState.startX) > 2;

	return (
		<div
			className={`state-timeline-panel ${themeClass}`}
			style={{ width, height }}
			data-testid="state-timeline-panel"
		>
			{rowCount > MAX_ROWS_WARNING && (
				<div
					className="state-timeline-panel__warning"
					data-testid="state-timeline-warning"
				>
					Too many series (&gt;100). Consider adding filters.
				</div>
			)}

			<div
				className="state-timeline-panel__body"
				style={{ height: availableHeight }}
			>
				<LabelColumn
					labels={labels}
					rowHeight={rowHeight}
					scrollTop={scrollTop}
					maxWidth={LABEL_COLUMN_MAX_WIDTH}
					visible={showLabelColumn}
				/>
				{/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- pointer-only drag-to-zoom surface, matching the uPlot chart panels */}
				<div
					className="state-timeline-panel__swim-lanes"
					role="presentation"
					style={{ cursor: onDragSelect ? 'crosshair' : 'default' }}
					data-testid="state-timeline-swim-lane-container"
					onMouseDown={handleDragStart}
					onMouseMove={handleDragMove}
					onMouseUp={handleDragEnd}
					onMouseLeave={handleDragLeave}
				>
					{showDragOverlay && (
						<div
							className="state-timeline-panel__drag-overlay"
							style={{
								left: `${Math.min(dragState.startX, dragState.currentX)}px`,
								width: `${Math.abs(dragState.currentX - dragState.startX)}px`,
							}}
						/>
					)}
					<Virtuoso
						data={rows}
						fixedItemHeight={rowHeight}
						overscan={{ main: 5 * rowHeight, reverse: 5 * rowHeight }}
						style={{ height: '100%' }}
						onScroll={handleVirtuosoScroll}
						itemContent={(_index, row: SwimLaneRowData): JSX.Element => (
							<SwimLaneRow
								row={row}
								timeRange={timeRange}
								height={rowHeight}
								onSegmentHover={(segment, event): void =>
									handleSegmentHover(segment, event, row.label)
								}
								onSegmentLeave={handleSegmentLeave}
							/>
						)}
					/>
				</div>
			</div>

			<div style={{ marginLeft: showLabelColumn ? labelColumnWidth : 0 }}>
				<TimeAxis
					timeRange={timeRange}
					width={swimLaneWidth}
					timezone={timezone.value}
				/>
			</div>

			<StateTimelineTooltip
				visible={tooltipState.visible}
				x={tooltipState.x}
				y={tooltipState.y}
				segment={tooltipState.segment}
				rowLabel={tooltipState.rowLabel}
				panelWidth={width}
				panelHeight={height}
				timezone={timezone.value}
			/>
		</div>
	);
}

export default memo(StateTimelinePanel);
