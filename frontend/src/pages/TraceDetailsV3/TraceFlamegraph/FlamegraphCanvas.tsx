import { useEffect, useRef, useState } from 'react';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { ROW_HEIGHT } from './constants';
import { useCanvasSetup } from './hooks/useCanvasSetup';
import { useFlamegraphDraw } from './hooks/useFlamegraphDraw';
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
	const [scrollTop] = useState<number>(0);

	useEffect(() => {
		//TODO: see if this can be removed as once loaded the view start and end ts will not change
		setViewStartTs(traceMetadata.startTime);
		setViewEndTs(traceMetadata.endTime);
	}, [traceMetadata.startTime, traceMetadata.endTime]);

	const _totalHeight = spans.length * ROW_HEIGHT;

	const { drawFlamegraph } = useFlamegraphDraw({
		canvasRef,
		containerRef,
		spans,
		viewStartTs,
		viewEndTs,
		scrollTop,
		selectedSpanId: selectedSpan?.spanId,
		hoveredSpanId: '',
		isDarkMode,
	});

	useCanvasSetup(canvasRef, containerRef, drawFlamegraph);

	return (
		<div
			ref={containerRef}
			style={{
				height: '100%',
				overflow: 'hidden',
				position: 'relative',
			}}
		>
			<canvas
				ref={canvasRef}
				style={{
					display: 'block',
					width: '100%',
				}}
			/>
		</div>
	);
}

export default FlamegraphCanvas;
