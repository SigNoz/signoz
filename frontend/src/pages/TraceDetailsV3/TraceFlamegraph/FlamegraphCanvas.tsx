import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import TimelineV3 from 'components/TimelineV3/TimelineV3';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { DEFAULT_ROW_HEIGHT } from './constants';
import { useCanvasSetup } from './hooks/useCanvasSetup';
import { useFlamegraphDrag } from './hooks/useFlamegraphDrag';
import { useFlamegraphDraw } from './hooks/useFlamegraphDraw';
import { useFlamegraphHover } from './hooks/useFlamegraphHover';
import { useFlamegraphZoom } from './hooks/useFlamegraphZoom';
import { FlamegraphCanvasProps, SpanRect } from './types';
import { formatDuration } from './utils';

function FlamegraphCanvas(props: FlamegraphCanvasProps): JSX.Element {
	const { spans, traceMetadata, firstSpanAtFetchLevel, onSpanClick } = props;

	const isDarkMode = useIsDarkMode(); //TODO: see if can be removed or use a new hook
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const spanRectsRef = useRef<SpanRect[]>([]);

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

	const totalHeight = spans.length * rowHeight;

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
		suppressClickRef,
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
		handleHoverMouseMove,
		handleHoverMouseLeave,
		handleClick,
		tooltipContent,
	} = useFlamegraphHover({
		canvasRef,
		spanRectsRef,
		traceMetadata,
		viewStartTs,
		viewEndTs,
		isDraggingRef,
		suppressClickRef,
		onSpanClick,
		isDarkMode,
	});

	const { drawFlamegraph } = useFlamegraphDraw({
		canvasRef,
		containerRef,
		spans,
		viewStartTs,
		viewEndTs,
		scrollTop,
		rowHeight,
		selectedSpanId: firstSpanAtFetchLevel || undefined,
		hoveredSpanId: hoveredSpanId ?? '',
		isDarkMode,
		spanRectsRef,
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

	// todo: move to a separate component/utils file
	const tooltipElement = tooltipContent
		? createPortal(
				<div
					style={{
						position: 'fixed',
						left: Math.min(tooltipContent.clientX + 15, window.innerWidth - 220),
						top: Math.min(tooltipContent.clientY + 15, window.innerHeight - 100),
						zIndex: 1000,
						backgroundColor: 'rgba(30, 30, 30, 0.95)',
						color: '#fff',
						padding: '8px 12px',
						borderRadius: 4,
						fontSize: 12,
						fontFamily: 'Inter, sans-serif',
						boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
						pointerEvents: 'none',
					}}
				>
					<div
						style={{
							fontWeight: 600,
							marginBottom: 4,
							color: tooltipContent.spanColor,
						}}
					>
						{tooltipContent.spanName}
					</div>
					<div>Status: {tooltipContent.status}</div>
					<div>Start: {tooltipContent.startMs.toFixed(2)} ms</div>
					<div>Duration: {formatDuration(tooltipContent.durationMs * 1e6)}</div>
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
			}}
		>
			{tooltipElement}
			<TimelineV3
				startTimestamp={viewStartTs}
				endTimestamp={viewEndTs}
				offsetTimestamp={viewStartTs - traceMetadata.startTime}
				timelineHeight={22}
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
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onClick={handleClick}
				/>
			</div>
		</div>
	);
}

export default FlamegraphCanvas;
