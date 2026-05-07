import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import TimelineV3 from 'components/TimelineV3/TimelineV3';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { EventTooltipContent } from '../SpanHoverCard/EventTooltipContent';
import { SpanTooltipContent } from '../SpanHoverCard/SpanHoverCard';
import { DEFAULT_ROW_HEIGHT } from './constants';
import { useCanvasSetup } from './hooks/useCanvasSetup';
import { useFlamegraphDrag } from './hooks/useFlamegraphDrag';
import { useFlamegraphDraw } from './hooks/useFlamegraphDraw';
import { useFlamegraphHover } from './hooks/useFlamegraphHover';
import { useFlamegraphZoom } from './hooks/useFlamegraphZoom';
import { useScrollToSpan } from './hooks/useScrollToSpan';
import { useVisualLayoutWorker } from './hooks/useVisualLayoutWorker';
import { EventRect, FlamegraphCanvasProps, SpanRect } from './types';

function FlamegraphCanvas(props: FlamegraphCanvasProps): JSX.Element {
	const { spans, traceMetadata, firstSpanAtFetchLevel, onSpanClick } = props;

	const isDarkMode = useIsDarkMode(); //TODO: see if can be removed or use a new hook
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const spanRectsRef = useRef<SpanRect[]>([]);
	const eventRectsRef = useRef<EventRect[]>([]);

	const [viewStartTs, setViewStartTs] = useState<number>(
		traceMetadata.startTime,
	);
	const [viewEndTs, setViewEndTs] = useState<number>(traceMetadata.endTime);
	const [scrollTop, setScrollTop] = useState<number>(0);
	const [rowHeight, setRowHeight] = useState<number>(DEFAULT_ROW_HEIGHT);

	// Mutable refs for zoom and drag hooks to read during rAF / mouse callbacks
	const viewStartRef = useRef(viewStartTs);
	const viewEndRef = useRef(viewEndTs);
	const rowHeightRef = useRef(rowHeight);
	const scrollTopRef = useRef(scrollTop);

	useEffect(() => {
		viewStartRef.current = viewStartTs;
	}, [viewStartTs]);

	useEffect(() => {
		viewEndRef.current = viewEndTs;
	}, [viewEndTs]);

	useEffect(() => {
		rowHeightRef.current = rowHeight;
	}, [rowHeight]);

	useEffect(() => {
		scrollTopRef.current = scrollTop;
	}, [scrollTop]);

	useEffect(() => {
		//TODO: see if this can be removed as once loaded the view start and end ts will not change
		setViewStartTs(traceMetadata.startTime);
		setViewEndTs(traceMetadata.endTime);
		viewStartRef.current = traceMetadata.startTime;
		viewEndRef.current = traceMetadata.endTime;
	}, [traceMetadata.startTime, traceMetadata.endTime]);

	const { layout, isComputing: _isComputing } = useVisualLayoutWorker(spans);

	const totalHeight = layout.totalVisualRows * rowHeight;

	const { isOverFlamegraphRef } = useFlamegraphZoom({
		canvasRef,
		traceMetadata,
		viewStartRef,
		viewEndRef,
		rowHeightRef,
		setViewStartTs,
		setViewEndTs,
		setRowHeight,
	});

	const {
		handleMouseDown,
		handleMouseMove: handleDragMouseMove,
		handleMouseUp,
		handleDragMouseLeave,
		isDraggingRef,
	} = useFlamegraphDrag({
		canvasRef,
		containerRef,
		traceMetadata,
		viewStartRef,
		viewEndRef,
		setViewStartTs,
		setViewEndTs,
		scrollTopRef,
		setScrollTop,
		totalHeight,
	});

	const {
		hoveredSpanId,
		hoveredEventKey,
		handleHoverMouseMove,
		handleHoverMouseLeave,
		handleMouseDownForClick,
		handleClick,
		tooltipContent,
	} = useFlamegraphHover({
		canvasRef,
		spanRectsRef,
		eventRectsRef,
		traceMetadata,
		viewStartTs,
		viewEndTs,
		isDraggingRef,
		onSpanClick,
		isDarkMode,
	});

	const { drawFlamegraph } = useFlamegraphDraw({
		canvasRef,
		containerRef,
		spans: layout.visualRows,
		connectors: layout.connectors,
		viewStartTs,
		viewEndTs,
		scrollTop,
		rowHeight,
		selectedSpanId: firstSpanAtFetchLevel || undefined,
		hoveredSpanId: hoveredSpanId ?? '',
		isDarkMode,
		spanRectsRef,
		eventRectsRef,
		hoveredEventKey,
	});

	useScrollToSpan({
		firstSpanAtFetchLevel,
		spans: layout.visualRows,
		traceMetadata,
		containerRef,
		viewStartRef,
		viewEndRef,
		scrollTopRef,
		rowHeight,
		setViewStartTs,
		setViewEndTs,
		setScrollTop,
	});

	useCanvasSetup(canvasRef, containerRef, drawFlamegraph);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent): void => {
			handleDragMouseMove(e);
			handleHoverMouseMove(e);
		},
		[handleDragMouseMove, handleHoverMouseMove],
	);

	const handleMouseLeave = useCallback((): void => {
		isOverFlamegraphRef.current = false;
		handleDragMouseLeave();
		handleHoverMouseLeave();
	}, [isOverFlamegraphRef, handleDragMouseLeave, handleHoverMouseLeave]);

	const tooltipElement = tooltipContent
		? createPortal(
				<div
					className="span-hover-card-popover"
					style={{
						position: 'fixed',
						left: Math.min(tooltipContent.clientX + 15, window.innerWidth - 220),
						top: Math.min(tooltipContent.clientY + 15, window.innerHeight - 100),
						zIndex: 1000,
						backgroundColor: 'rgba(30, 30, 30, 0.95)',
						padding: '8px 12px',
						borderRadius: 4,
						boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
						pointerEvents: 'none',
					}}
				>
					{tooltipContent.event ? (
						<EventTooltipContent
							eventName={tooltipContent.event.name}
							timeOffsetMs={tooltipContent.event.timeOffsetMs}
							isError={tooltipContent.event.isError}
							attributeMap={tooltipContent.event.attributeMap}
						/>
					) : (
						<SpanTooltipContent
							spanName={tooltipContent.spanName}
							color={tooltipContent.spanColor}
							hasError={tooltipContent.status === 'error'}
							relativeStartMs={tooltipContent.startMs}
							durationMs={tooltipContent.durationMs}
						/>
					)}
				</div>,
				document.body,
		  )
		: null;

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: '100%',
				padding: '0 15px',
			}}
		>
			{tooltipElement}
			<TimelineV3
				startTimestamp={viewStartTs}
				endTimestamp={viewEndTs}
				offsetTimestamp={viewStartTs - traceMetadata.startTime}
				timelineHeight={10}
			/>
			<div
				ref={containerRef}
				style={{
					flex: 1,
					overflow: 'hidden',
					position: 'relative',
				}}
				onMouseEnter={(): void => {
					isOverFlamegraphRef.current = true;
				}}
				onMouseLeave={handleMouseLeave}
			>
				<canvas
					ref={canvasRef}
					style={{
						display: 'block',
						width: '100%',
						cursor: 'grab',
					}}
					onMouseDown={(e): void => {
						handleMouseDown(e);
						handleMouseDownForClick(e);
					}}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onClick={handleClick}
				/>
			</div>
		</div>
	);
}

export default FlamegraphCanvas;
