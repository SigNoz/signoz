import { useCallback, useEffect, useRef, useState } from 'react';
import TimelineV3 from 'components/TimelineV3/TimelineV3';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { DEFAULT_ROW_HEIGHT } from './constants';
import { useCanvasSetup } from './hooks/useCanvasSetup';
import { useFlamegraphDrag } from './hooks/useFlamegraphDrag';
import { useFlamegraphDraw } from './hooks/useFlamegraphDraw';
import { useFlamegraphZoom } from './hooks/useFlamegraphZoom';
import { FlamegraphCanvasProps } from './types';

function FlamegraphCanvas(props: FlamegraphCanvasProps): JSX.Element {
	const { spans, traceMetadata, selectedSpan } = props;

	const isDarkMode = useIsDarkMode(); //TODO: see if can be removed or use a new hook
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

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
		handleMouseMove,
		handleMouseUp,
		handleDragMouseLeave,
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

	const { drawFlamegraph } = useFlamegraphDraw({
		canvasRef,
		containerRef,
		spans,
		viewStartTs,
		viewEndTs,
		scrollTop,
		rowHeight,
		selectedSpanId: selectedSpan?.spanId,
		hoveredSpanId: '',
		isDarkMode,
	});

	useCanvasSetup(canvasRef, containerRef, drawFlamegraph);

	const handleMouseLeave = useCallback((): void => {
		isOverFlamegraphRef.current = false;
		handleDragMouseLeave();
	}, [isOverFlamegraphRef, handleDragMouseLeave]);

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: '100%',
			}}
		>
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
				/>
			</div>
		</div>
	);
}

export default FlamegraphCanvas;
