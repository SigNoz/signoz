import { CSSProperties, memo, MouseEvent, useCallback, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { LegendPosition } from 'types/api/dashboard/getAll';
import { useTimezone } from 'providers/Timezone';

import LabelColumn from './LabelColumn';
import SwimLaneRow from './SwimLaneRow';
import TimeAxis from './TimeAxis';
import StateTimelineTooltip from './StateTimelineTooltip';
import { SegmentData, SwimLaneModel, SwimLaneRowData } from './utils/transformData';

// ===== Constants =====

const TIME_AXIS_HEIGHT = 30;
const MIN_ROW_HEIGHT = 36;
const LABEL_COLUMN_MAX_WIDTH = 200;
const MAX_ROWS_WARNING = 100;

// ===== Interfaces =====

export interface StateTimelinePanelProps {
	swimLaneModel: SwimLaneModel;
	width: number;
	height: number;
	isDarkMode: boolean;
	legendPosition: LegendPosition;
	onSegmentClick?: (segment: SegmentData, row: SwimLaneRowData) => void;
	onDragSelect?: (startTime: number, endTime: number) => void;
}

interface TooltipState {
	visible: boolean;
	x: number;
	y: number;
	segment: SegmentData | null;
	rowLabel: string;
}

// ===== Helper =====

/**
 * Computes the row height based on available height and row count.
 * Formula: max(floor(availableHeight / rowCount), 20)
 */
export function computeRowHeight(
	availableHeight: number,
	rowCount: number,
): number {
	if (rowCount <= 0) return MIN_ROW_HEIGHT;
	return Math.max(Math.floor(availableHeight / rowCount), MIN_ROW_HEIGHT);
}

// ===== Component =====

function StateTimelinePanel({
	swimLaneModel,
	width,
	height,
	isDarkMode,
	legendPosition,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	onSegmentClick,
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

	// Drag-to-zoom selection state
	const [dragState, setDragState] = useState<{
		isDragging: boolean;
		startX: number;
		currentX: number;
	}>({ isDragging: false, startX: 0, currentX: 0 });

	const { rows, timeRange } = swimLaneModel;
	const rowCount = rows.length;

	// Layout calculations
	const availableHeight = height - TIME_AXIS_HEIGHT;
	const rowHeight = computeRowHeight(availableHeight, rowCount);

	// Label column visibility based on legend position
	const showLabelColumn = legendPosition !== LegendPosition.RIGHT;
	const labels = rows.map((row) => row.label);

	// Swim-lane width = total width minus label column width (if visible)
	const labelColumnWidth = showLabelColumn ? Math.min(LABEL_COLUMN_MAX_WIDTH, width * 0.3) : 0;
	const swimLaneWidth = Math.max(width - labelColumnWidth, 50);

	// Tooltip handlers
	const handleSegmentHover = useCallback(
		(segment: SegmentData, event: MouseEvent, rowLabel: string): void => {
			const target = event.currentTarget as HTMLElement;
			const panelRect = target.closest(
				'[data-testid="state-timeline-panel"]',
			);
			if (panelRect) {
				const rect = panelRect.getBoundingClientRect();
				setTooltipState({
					visible: true,
					x: event.clientX - rect.left,
					y: event.clientY - rect.top,
					segment,
					rowLabel,
				});
			} else {
				setTooltipState({
					visible: true,
					x: event.clientX,
					y: event.clientY,
					segment,
					rowLabel,
				});
			}
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

	// Theme class
	const themeClass = isDarkMode
		? 'state-timeline-panel--dark'
		: 'state-timeline-panel--light';

	// Panel container styles
	const panelContainerStyle: CSSProperties = {
		width: `${width}px`,
		height: `${height}px`,
		position: 'relative',
		overflow: 'hidden',
	};

	const bodyContainerStyle: CSSProperties = {
		display: 'flex',
		flexDirection: 'row',
		height: `${availableHeight}px`,
		width: '100%',
	};

	const swimLaneContainerStyle: CSSProperties = {
		flex: 1,
		height: '100%',
		overflow: 'hidden',
		minWidth: 0,
	};

	// No data message
	if (rowCount === 0) {
		const noDataStyle: CSSProperties = {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			width: '100%',
			height: '100%',
		};

		return (
			<div
				className={`state-timeline-panel ${themeClass}`}
				style={panelContainerStyle}
				data-testid="state-timeline-panel"
			>
				<div style={noDataStyle} data-testid="state-timeline-no-data">
					No Data
				</div>
			</div>
		);
	}

	return (
		<div
			className={`state-timeline-panel ${themeClass}`}
			style={panelContainerStyle}
			data-testid="state-timeline-panel"
		>
			{/* Warning banner for too many series */}
			{rowCount > MAX_ROWS_WARNING && (
				<div
					data-testid="state-timeline-warning"
					style={{
						padding: '4px 8px',
						backgroundColor: isDarkMode ? '#78350f' : '#fef3c7',
						color: isDarkMode ? '#fbbf24' : '#92400e',
						fontSize: '12px',
						textAlign: 'center',
					}}
				>
					Too many series (&gt;100). Consider adding filters.
				</div>
			)}

			{/* Main body: LabelColumn + SwimLanes */}
			<div style={bodyContainerStyle}>
				<LabelColumn
					labels={labels}
					rowHeight={rowHeight}
					scrollTop={scrollTop}
					maxWidth={LABEL_COLUMN_MAX_WIDTH}
					visible={showLabelColumn}
				/>

				<div
					style={{
						...swimLaneContainerStyle,
						position: 'relative',
						cursor: onDragSelect ? 'crosshair' : 'default',
					}}
					data-testid="state-timeline-swim-lane-container"
					onMouseDown={(e): void => {
						if (!onDragSelect) return;
						const rect = e.currentTarget.getBoundingClientRect();
						const x = e.clientX - rect.left;
						setDragState({ isDragging: true, startX: x, currentX: x });
					}}
					onMouseMove={(e): void => {
						if (!dragState.isDragging) return;
						const rect = e.currentTarget.getBoundingClientRect();
						const x = e.clientX - rect.left;
						setDragState((prev) => ({ ...prev, currentX: x }));
					}}
					onMouseUp={(): void => {
						if (!dragState.isDragging || !onDragSelect) {
							setDragState({ isDragging: false, startX: 0, currentX: 0 });
							return;
						}
						const totalDuration = timeRange.end - timeRange.start;
						const containerWidth = swimLaneWidth;
						const left = Math.min(dragState.startX, dragState.currentX);
						const right = Math.max(dragState.startX, dragState.currentX);
						// Only trigger if dragged at least 5px
						if (right - left > 5) {
							const startTime = timeRange.start + (left / containerWidth) * totalDuration;
							const endTime = timeRange.start + (right / containerWidth) * totalDuration;
							onDragSelect(startTime * 1000, endTime * 1000);
						}
						setDragState({ isDragging: false, startX: 0, currentX: 0 });
					}}
					onMouseLeave={(): void => {
						if (dragState.isDragging) {
							setDragState({ isDragging: false, startX: 0, currentX: 0 });
						}
					}}
				>
					{/* Drag selection overlay */}
					{dragState.isDragging && Math.abs(dragState.currentX - dragState.startX) > 2 && (
						<div
							style={{
								position: 'absolute',
								top: 0,
								left: `${Math.min(dragState.startX, dragState.currentX)}px`,
								width: `${Math.abs(dragState.currentX - dragState.startX)}px`,
								height: '100%',
								backgroundColor: 'rgba(255, 255, 255, 0.1)',
								border: '1px solid rgba(255, 255, 255, 0.3)',
								zIndex: 10,
								pointerEvents: 'none',
							}}
						/>
					)}
					<Virtuoso
						data={rows}
						fixedItemHeight={rowHeight}
						overscan={{ main: 5 * rowHeight, reverse: 5 * rowHeight }}
						style={{ height: '100%' }}
						onScroll={handleVirtuosoScroll}
						itemContent={(index, row): JSX.Element => (
							<SwimLaneRow
								key={index}
								row={row}
								timeRange={timeRange}
								width={swimLaneWidth}
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

			{/* Time Axis */}
			<div style={{ marginLeft: showLabelColumn ? `${LABEL_COLUMN_MAX_WIDTH}px` : 0 }}>
				<TimeAxis
					timeRange={timeRange}
					width={swimLaneWidth}
					timezone={timezone.value}
				/>
			</div>

			{/* Tooltip */}
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
