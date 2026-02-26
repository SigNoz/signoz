// @ts-nocheck
/* eslint-disable */
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Button } from 'antd';
import Color from 'color';
import TimelineV2 from 'components/TimelineV2/TimelineV2';
import { themeColors } from 'constants/theme';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';
import { Span } from 'types/api/trace/getTraceV2';

import './Success.styles.scss';

interface ITraceMetadata {
	startTime: number;
	endTime: number;
}

interface ISuccessProps {
	spans: FlamegraphSpan[][];
	firstSpanAtFetchLevel: string;
	setFirstSpanAtFetchLevel: Dispatch<SetStateAction<string>>;
	traceMetadata: ITraceMetadata;
	selectedSpan: Span | undefined;
	onFetchMoreData: () => void;
}

// // Constants for rendering
// const ROW_HEIGHT = 24; // 18px height + 6px padding
// const SPAN_BAR_HEIGHT = 12;
// const EVENT_DOT_SIZE = 6;
// const SPAN_BAR_Y_OFFSET = 3; // Center the 12px bar in 18px row

// ✅ start with 24

const MAX_ROW_HEIGHT = 24;
const MIN_ROW_HEIGHT = 6;

const DEFAULT_ROW_HEIGHT = MIN_ROW_HEIGHT;

const clamp = (v: number, min: number, max: number): number =>
	Math.max(min, Math.min(max, v));
const getFlamegraphRowMetrics = (
	rowHeight: number,
): {
	ROW_HEIGHT: number;
	SPAN_BAR_HEIGHT: number;
	SPAN_BAR_Y_OFFSET: number;
	EVENT_DOT_SIZE: number;
} => {
	// 24 -> 12, 16 -> 8 (nice scaling)
	const spanBarHeight = clamp(Math.round(rowHeight * 0.5), 8, 12);
	const spanBarYOffset = Math.floor((rowHeight - spanBarHeight) / 2);

	// 12 -> 6, 8 -> 4
	const eventDotSize = clamp(Math.round(spanBarHeight * 0.5), 4, 6);

	return {
		ROW_HEIGHT: rowHeight,
		SPAN_BAR_HEIGHT: spanBarHeight,
		SPAN_BAR_Y_OFFSET: spanBarYOffset,
		EVENT_DOT_SIZE: eventDotSize,
	};
};

const getRowIndexFromCursorY = (
	cssY: number,
	rowHeight: number,
	totalRows: number,
): number => clamp(Math.floor(cssY / rowHeight), 0, totalRows - 1);

const getClosestSpanAtLevel = (
	levelSpans: FlamegraphSpan[] | undefined,
	cursorTs: number,
): FlamegraphSpan | null => {
	if (!levelSpans || levelSpans.length === 0) {
		return null;
	}

	let closest: FlamegraphSpan | null = null;
	let minDist = Infinity;

	for (const span of levelSpans) {
		const spanStart = span.timestamp;
		const spanEnd = span.timestamp + span.durationNano / 1e6;

		if (cursorTs >= spanStart && cursorTs <= spanEnd) {
			return span;
		}

		const dist = Math.min(
			Math.abs(cursorTs - spanStart),
			Math.abs(cursorTs - spanEnd),
		);
		if (dist < minDist) {
			minDist = dist;
			closest = span;
		}
	}

	return closest;
};

interface SpanRect {
	span: FlamegraphSpan;
	x: number;
	y: number;
	width: number;
	height: number;
	level: number;
}

function Success(props: ISuccessProps): JSX.Element {
	const {
		spans,
		setFirstSpanAtFetchLevel,
		traceMetadata,
		firstSpanAtFetchLevel,
		selectedSpan,
		onFetchMoreData,
	} = props;
	const { search } = useLocation();
	const history = useHistory();
	const isDarkMode = useIsDarkMode();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [hoveredSpanId, setHoveredSpanId] = useState<string>('');
	const [tooltipContent, setTooltipContent] = useState<{
		content: string;
		x: number;
		y: number;
	} | null>(null);
	const [scrollTop, setScrollTop] = useState<number>(0);

	// Time window state (instead of zoom/pan in pixel space)
	const [viewStartTs, setViewStartTs] = useState<number>(
		traceMetadata.startTime,
	);
	const [viewEndTs, setViewEndTs] = useState<number>(traceMetadata.endTime);
	const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

	// Refs to avoid stale state during rapid wheel events and dragging
	const viewStartRef = useRef(viewStartTs);
	const viewEndRef = useRef(viewEndTs);

	// ############################################################
	const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT);
	const rowHeightRef = useRef(rowHeight);
	useEffect(() => {
		rowHeightRef.current = rowHeight;
	}, [rowHeight]);

	const {
		ROW_HEIGHT,
		SPAN_BAR_HEIGHT,
		SPAN_BAR_Y_OFFSET,
		EVENT_DOT_SIZE,
	} = useMemo(() => getFlamegraphRowMetrics(rowHeight), [rowHeight]);

	// ############################################################

	useEffect(() => {
		viewStartRef.current = viewStartTs;
		viewEndRef.current = viewEndTs;
	}, [viewStartTs, viewEndTs]);

	// Drag state in refs to avoid re-renders during drag
	const isDraggingRef = useRef(false);
	const dragStartRef = useRef<{ x: number; y: number } | null>(null);
	const dragDistanceRef = useRef(0);
	const suppressClickRef = useRef(false);

	// Scroll ref to avoid recreating getCanvasPointer on every scroll
	const scrollTopRef = useRef(0);

	useEffect(() => {
		scrollTopRef.current = scrollTop;
	}, [scrollTop]);

	// Build a flat array of span rectangles for hit testing
	const spanRects = useRef<SpanRect[]>([]);

	// Get span color based on service, error state, and selection
	const getSpanColor = useCallback(
		(span: FlamegraphSpan): string => {
			let color = generateColor(span.serviceName, themeColors.traceDetailColors);

			if (span.hasError) {
				color = isDarkMode ? 'rgb(239, 68, 68)' : 'rgb(220, 38, 38)';
			}

			// Apply selection/hover highlight
			if (selectedSpan?.spanId === span.spanId || hoveredSpanId === span.spanId) {
				const colorObj = Color(color);
				color = isDarkMode
					? colorObj.lighten(0.7).hex()
					: colorObj.darken(0.7).hex();
			}

			return color;
		},
		[isDarkMode, selectedSpan, hoveredSpanId],
	);

	// Draw a single event dot
	const drawEventDot = useCallback(
		(
			ctx: CanvasRenderingContext2D,
			x: number,
			y: number,
			isError: boolean,
		): void => {
			// could be optimized:
			// ctx.beginPath();
			// ctx.moveTo(x, y - size/2);
			// ctx.lineTo(x + size/2, y);
			// ctx.lineTo(x, y + size/2);
			// ctx.lineTo(x - size/2, y);
			// ctx.closePath();
			// ctx.fill();
			// ctx.stroke();
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(Math.PI / 4); // 45 degrees

			if (isError) {
				ctx.fillStyle = isDarkMode ? 'rgb(239, 68, 68)' : 'rgb(220, 38, 38)';
				ctx.strokeStyle = isDarkMode ? 'rgb(185, 28, 28)' : 'rgb(153, 27, 27)';
			} else {
				ctx.fillStyle = isDarkMode ? 'rgb(14, 165, 233)' : 'rgb(6, 182, 212)';
				ctx.strokeStyle = isDarkMode ? 'rgb(2, 132, 199)' : 'rgb(8, 145, 178)';
			}

			ctx.lineWidth = 1;
			ctx.fillRect(
				-EVENT_DOT_SIZE / 2,
				-EVENT_DOT_SIZE / 2,
				EVENT_DOT_SIZE,
				EVENT_DOT_SIZE,
			);
			ctx.strokeRect(
				-EVENT_DOT_SIZE / 2,
				-EVENT_DOT_SIZE / 2,
				EVENT_DOT_SIZE,
				EVENT_DOT_SIZE,
			);
			ctx.restore();
		},
		[isDarkMode, EVENT_DOT_SIZE],
	);

	// Draw a single span and its events
	const drawSpan = useCallback(
		(
			ctx: CanvasRenderingContext2D,
			span: FlamegraphSpan,
			x: number,
			y: number,
			width: number,
			levelIndex: number,
			spanRectsArray: SpanRect[],
		): void => {
			const color = getSpanColor(span); // do not depend on hover/clicks
			const spanY = y + SPAN_BAR_Y_OFFSET;

			// Draw span rectangle
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.roundRect(x, spanY, width, SPAN_BAR_HEIGHT, 6);
			ctx.fill();

			// Store rect for hit testing
			// consider per level buckets to improve hit testing
			// So hover can:
			// compute level from y
			// search only within that row
			spanRectsArray.push({
				span,
				x,
				y: spanY,
				width,
				height: SPAN_BAR_HEIGHT,
				level: levelIndex,
			});

			// Draw events
			// think about optimizing this.
			// if span is too small to draw events, skip drawing events???
			span.event?.forEach((event) => {
				const eventTimeMs = event.timeUnixNano / 1e6;
				const eventOffsetPercent =
					((eventTimeMs - span.timestamp) / (span.durationNano / 1e6)) * 100;
				const clampedOffset = Math.max(1, Math.min(eventOffsetPercent, 99));
				const eventX = x + (clampedOffset / 100) * width;
				const eventY = spanY + SPAN_BAR_HEIGHT / 2;

				drawEventDot(ctx, eventX, eventY, event.isError);
			});
		},
		[getSpanColor, drawEventDot, SPAN_BAR_HEIGHT, SPAN_BAR_Y_OFFSET],
	);

	// Draw the flamegraph on canvas
	const drawFlamegraph = useCallback(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) {
			return;
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return;
		}

		const dpr = window.devicePixelRatio || 1;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const timeSpan = viewEndTs - viewStartTs;
		if (timeSpan <= 0) {
			return;
		}

		const cssWidth = canvas.width / dpr;

		// ---- Vertical clipping window ----
		const viewportHeight = container.clientHeight;
		const overscan = 4;

		const firstLevel = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - overscan);
		const visibleLevelCount =
			Math.ceil(viewportHeight / ROW_HEIGHT) + 2 * overscan;
		const lastLevel = Math.min(spans.length - 1, firstLevel + visibleLevelCount);

		// ---- Clear only visible region (recommended) ----
		const clearTop = firstLevel * ROW_HEIGHT;
		const clearHeight = (lastLevel - firstLevel + 1) * ROW_HEIGHT;
		// ctx.clearRect(0, clearTop, cssWidth, clearHeight);
		ctx.clearRect(0, 0, cssWidth, viewportHeight);

		const spanRectsArray: SpanRect[] = [];

		// ---- Draw only visible levels ----
		for (let levelIndex = firstLevel; levelIndex <= lastLevel; levelIndex++) {
			const levelSpans = spans[levelIndex];
			if (!levelSpans) {
				continue;
			}

			const y = levelIndex * ROW_HEIGHT - scrollTopRef.current;

			for (let i = 0; i < levelSpans.length; i++) {
				const span = levelSpans[i];

				const spanStartMs = span.timestamp;
				const spanEndMs = span.timestamp + span.durationNano / 1e6;

				// Time culling (already correct)
				if (spanEndMs < viewStartTs || spanStartMs > viewEndTs) {
					continue;
				}

				const leftOffset = ((spanStartMs - viewStartTs) / timeSpan) * cssWidth;
				const rightEdge = ((spanEndMs - viewStartTs) / timeSpan) * cssWidth;
				let width = rightEdge - leftOffset;

				// Clamp to visible x-range
				if (leftOffset < 0) {
					width += leftOffset;
					if (width <= 0) {
						continue;
					}
				}
				if (rightEdge > cssWidth) {
					width = cssWidth - Math.max(0, leftOffset);
					if (width <= 0) {
						continue;
					}
				}

				// Optional: minimum 1px width
				if (width > 0 && width < 1) {
					width = 1;
				}

				drawSpan(
					ctx,
					span,
					Math.max(0, leftOffset),
					y,
					width,
					levelIndex,
					spanRectsArray,
				);
			}
		}

		spanRects.current = spanRectsArray;
	}, [spans, viewStartTs, viewEndTs, scrollTop, drawSpan, ROW_HEIGHT]);

	// Calculate total canvas height
	const totalHeight = spans.length * ROW_HEIGHT;

	const fullSpanMs = traceMetadata.endTime - traceMetadata.startTime;
	const viewSpanMs = viewEndTs - viewStartTs;
	const isZoomedPastThreshold = fullSpanMs > 0 && viewSpanMs / fullSpanMs < 0.5;

	const handleFetchMoreData = useCallback(() => {
		console.log('fetching more data');
		onFetchMoreData();
	}, [onFetchMoreData]);

	// Initialize time window when trace metadata changes (only if not already set)
	useEffect(() => {
		// Only reset if we're at the default view (full trace)
		// This prevents resetting zoom/pan when metadata updates
		if (
			viewStartTs === traceMetadata.startTime &&
			viewEndTs === traceMetadata.endTime
		) {
			// Already at default, no need to update
			return;
		}
		// Only reset if the trace bounds have actually changed significantly
		const currentSpan = viewEndTs - viewStartTs;
		const fullSpan = traceMetadata.endTime - traceMetadata.startTime;
		// If we're zoomed in, preserve the zoom level relative to new bounds
		if (currentSpan < fullSpan * 0.99) {
			// We're zoomed in, adjust the window proportionally
			const ratio = currentSpan / fullSpan;
			const newSpan = (traceMetadata.endTime - traceMetadata.startTime) * ratio;
			const center = (viewStartTs + viewEndTs) / 2;
			const newStart = Math.max(
				traceMetadata.startTime,
				Math.min(center - newSpan / 2, traceMetadata.endTime - newSpan),
			);
			setViewStartTs(newStart);
			setViewEndTs(newStart + newSpan);
		} else {
			// We're at full view, reset to new full view
			setViewStartTs(traceMetadata.startTime);
			setViewEndTs(traceMetadata.endTime);
		}
	}, [traceMetadata.startTime, traceMetadata.endTime, viewStartTs, viewEndTs]);

	// Handle canvas resize with device pixel ratio
	useEffect(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) {
			return;
		}

		const updateCanvasSize = (): void => {
			const rect = container.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;

			const viewportHeight = container.clientHeight;
			// Set CSS size
			canvas.style.width = `${rect.width}px`;
			canvas.style.height = `${viewportHeight}px`;

			// Set actual pixel size (accounting for DPR)
			// Only update if size actually changed to prevent unnecessary redraws
			const newWidth = Math.floor(rect.width * dpr);
			const newHeight = Math.floor(viewportHeight * dpr);

			if (canvas.width !== newWidth || canvas.height !== newHeight) {
				canvas.width = newWidth;
				canvas.height = newHeight;
				// Redraw with current time window (preserves zoom/pan)
				drawFlamegraph();
			}
		};

		const resizeObserver = new ResizeObserver(updateCanvasSize);
		resizeObserver.observe(container);

		// Initial size
		updateCanvasSize();

		// Handle DPR changes (e.g., moving window between screens)
		const handleDPRChange = (): void => {
			updateCanvasSize();
		};
		window
			.matchMedia('(resolution: 1dppx)')
			.addEventListener('change', handleDPRChange);

		return (): void => {
			resizeObserver.disconnect();
			window
				.matchMedia('(resolution: 1dppx)')
				.removeEventListener('change', handleDPRChange);
		};
	}, [drawFlamegraph]);

	// Re-draw when data changes
	useEffect(() => {
		drawFlamegraph();
	}, [drawFlamegraph]);

	// Find span at given canvas coordinates
	const findSpanAtPosition = useCallback((x: number, y: number):
		| SpanRect
		| undefined => {
		return spanRects.current.find(
			(spanRect) =>
				x >= spanRect.x &&
				x <= spanRect.x + spanRect.width &&
				y >= spanRect.y &&
				y <= spanRect.y + spanRect.height,
		);
	}, []);

	// Utility to convert client coordinates to CSS canvas coordinates
	const getCanvasPointer = useCallback((clientX: number, clientY: number): {
		cssX: number;
		cssY: number;
		cssWidth: number;
	} | null => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return null;
		}

		const rect = canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;

		const cssWidth = canvas.width / dpr;

		const cssX = (clientX - rect.left) * (cssWidth / rect.width);

		const cssY = clientY - rect.top + scrollTopRef.current;

		return { cssX, cssY, cssWidth };
	}, []);

	const clampScrollTop = useCallback(
		(next: number) => {
			const container = containerRef.current;
			if (!container) {
				return 0;
			}

			const viewportHeight = container.clientHeight;
			const maxScroll = Math.max(0, totalHeight - viewportHeight);

			return Math.max(0, Math.min(next, maxScroll));
		},
		[totalHeight],
	);

	// Handle mouse move for hover and dragging
	const handleMouseMove = useCallback(
		(event: React.MouseEvent<HTMLCanvasElement>) => {
			const canvas = canvasRef.current;
			if (!canvas) {
				return;
			}

			const rect = canvas.getBoundingClientRect();

			// ---- Dragging (pan in time space) ----
			if (isDraggingRef.current && dragStartRef.current) {
				const deltaX = event.clientX - dragStartRef.current.x;
				const deltaY = event.clientY - dragStartRef.current.y;

				const totalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
				dragDistanceRef.current = totalDistance;

				const timeSpan = viewEndRef.current - viewStartRef.current;
				const deltaTime = (deltaX / rect.width) * timeSpan;

				const newStart = viewStartRef.current - deltaTime;

				const clampedStart = Math.max(
					traceMetadata.startTime,
					Math.min(newStart, traceMetadata.endTime - timeSpan),
				);

				const clampedEnd = clampedStart + timeSpan;

				setViewStartTs(clampedStart);
				setViewEndTs(clampedEnd);

				const nextScrollTop = clampScrollTop(scrollTopRef.current - deltaY);
				scrollTopRef.current = nextScrollTop;
				setScrollTop(nextScrollTop);

				dragStartRef.current = {
					x: event.clientX,
					y: event.clientY,
				};

				return;
			}

			// ---- Hover ----
			const pointer = getCanvasPointer(event.clientX, event.clientY);

			if (!pointer) {
				return;
			}

			const { cssX, cssY } = pointer;
			const hoveredSpan = findSpanAtPosition(cssX, cssY);

			if (hoveredSpan) {
				setHoveredSpanId(hoveredSpan.span.spanId);
				setTooltipContent({
					content: hoveredSpan.span.name,
					x: event.clientX,
					y: event.clientY,
				});
				canvas.style.cursor = 'pointer';
			} else {
				setHoveredSpanId('');
				setTooltipContent(null);
				// Set cursor based on space key state when not hovering
				canvas.style.cursor = isSpacePressed ? 'grab' : 'default';
			}
		},
		[
			findSpanAtPosition,
			traceMetadata,
			getCanvasPointer,
			isSpacePressed,
			clampScrollTop,
		],
	);

	// Handle key down for space key
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent): void => {
			if (event.code === 'Space') {
				event.preventDefault();
				setIsSpacePressed(true);
			}
		};

		const handleKeyUp = (event: KeyboardEvent): void => {
			if (event.code === 'Space') {
				event.preventDefault();
				setIsSpacePressed(false);
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		return (): void => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, []);

	const handleMouseDown = useCallback(
		(event: React.MouseEvent<HTMLCanvasElement>) => {
			if (event.button !== 0) {
				return;
			} // left click only

			event.preventDefault();

			isDraggingRef.current = true;
			dragStartRef.current = {
				x: event.clientX,
				y: event.clientY,
			};
			dragDistanceRef.current = 0;

			const canvas = canvasRef.current;
			if (canvas) {
				canvas.style.cursor = 'grabbing';
			}
		},
		[],
	);

	const handleMouseUp = useCallback(() => {
		const wasDrag = dragDistanceRef.current > 5;

		suppressClickRef.current = wasDrag; // 👈 key fix: suppress click after drag

		isDraggingRef.current = false;
		dragStartRef.current = null;
		dragDistanceRef.current = 0;

		const canvas = canvasRef.current;
		if (canvas) {
			canvas.style.cursor = 'grab';
		}

		return wasDrag;
	}, []);

	const handleMouseLeave = useCallback(() => {
		isOverFlamegraphRef.current = false;

		setHoveredSpanId('');
		setTooltipContent(null);

		isDraggingRef.current = false;
		dragStartRef.current = null;
		dragDistanceRef.current = 0;

		const canvas = canvasRef.current;
		if (canvas) {
			canvas.style.cursor = 'grab';
		}
	}, []);

	const handleClick = useCallback(
		(event: React.MouseEvent<HTMLCanvasElement>) => {
			// Prevent click after drag
			if (suppressClickRef.current) {
				suppressClickRef.current = false; // reset after suppressing once
				return;
			}

			const pointer = getCanvasPointer(event.clientX, event.clientY);

			if (!pointer) {
				return;
			}

			const { cssX, cssY } = pointer;
			const clickedSpan = findSpanAtPosition(cssX, cssY);

			if (!clickedSpan) {
				return;
			}

			const searchParams = new URLSearchParams(search);
			const currentSpanId = searchParams.get('spanId');

			if (currentSpanId !== clickedSpan.span.spanId) {
				searchParams.set('spanId', clickedSpan.span.spanId);
				history.replace({ search: searchParams.toString() });
			}
		},
		[search, history, findSpanAtPosition, getCanvasPointer],
	);

	const isOverFlamegraphRef = useRef(false);

	useEffect(() => {
		const onWheel = (e: WheelEvent) => {
			// Pinch zoom on trackpads often comes as ctrl+wheel
			if (isOverFlamegraphRef.current && e.ctrlKey) {
				e.preventDefault(); // stops browser zoom
			}
		};

		// capture:true ensures we intercept early
		window.addEventListener('wheel', onWheel, { passive: false, capture: true });

		return () => {
			window.removeEventListener(
				'wheel',
				onWheel as any,
				{ capture: true } as any,
			);
		};
	}, []);

	const wheelDeltaRef = useRef(0);
	const rafRef = useRef<number | null>(null);
	const lastCursorXRef = useRef(0);
	const lastCursorYRef = useRef(0);
	const lastCssWidthRef = useRef(1);
	const lastIsPinchRef = useRef(false);
	const lastWheelClientXRef = useRef<number | null>(null);

	const applyWheelZoom = useCallback(() => {
		rafRef.current = null;

		const cssWidth = lastCssWidthRef.current || 1;
		const cursorX = lastCursorXRef.current;

		const fullSpanMs = traceMetadata.endTime - traceMetadata.startTime;

		const oldStart = viewStartRef.current;
		const oldEnd = viewEndRef.current;
		const oldSpan = oldEnd - oldStart;

		const deltaY = wheelDeltaRef.current;
		wheelDeltaRef.current = 0;
		if (deltaY === 0) {
			return;
		}

		const rowIndex = getRowIndexFromCursorY(
			lastCursorYRef.current,
			rowHeightRef.current,
			spans.length,
		);
		const cursorRatioForLevel = Math.max(0, Math.min(cursorX / cssWidth, 1));
		const cursorTs = oldStart + cursorRatioForLevel * oldSpan;
		const closestSpan = getClosestSpanAtLevel(spans[rowIndex], cursorTs);
		console.log(
			'[zoom] rowIndex:',
			rowIndex,
			'span level:',
			closestSpan?.level,
			'closest span:',
			closestSpan,
		);

		const zoomIntensityH = lastIsPinchRef.current ? 0.01 : 0.0015;
		const zoomIntensityV = lastIsPinchRef.current ? 0.008 : 0.001;

		const factorH = Math.exp(deltaY * zoomIntensityH);
		const factorV = Math.exp(deltaY * zoomIntensityV);

		// --- Horizontal target ---
		const desiredSpan = oldSpan * factorH;
		const minSpanMs = Math.max(5, oldSpan / Math.max(cssWidth, 1));
		console.log('[zoom] minSpanMs:', minSpanMs);
		console.log('[zoom] fullSpanMs:', fullSpanMs);
		console.log('[zoom] desiredSpan:', desiredSpan);

		const clampedSpan = Math.max(minSpanMs, Math.min(fullSpanMs, desiredSpan));

		const cursorRatio = Math.max(0, Math.min(cursorX / cssWidth, 1));
		const anchorTs = oldStart + cursorRatio * oldSpan;

		let nextStart = anchorTs - cursorRatio * clampedSpan;
		nextStart = Math.max(
			traceMetadata.startTime,
			Math.min(nextStart, traceMetadata.endTime - clampedSpan),
		);
		const nextEnd = nextStart + clampedSpan;

		// --- Vertical target ---
		const desiredRow = rowHeightRef.current * (1 / factorV);
		const nextRow = Math.max(
			MIN_ROW_HEIGHT,
			Math.min(MAX_ROW_HEIGHT, desiredRow),
		);

		// Commit (and update refs immediately to avoid any stale wheel bursts)
		viewStartRef.current = nextStart;
		viewEndRef.current = nextEnd;
		rowHeightRef.current = nextRow;

		setViewStartTs(nextStart);
		setViewEndTs(nextEnd);
		setRowHeight(nextRow);
	}, [traceMetadata, spans]);

	const applyWheelZoom2 = useCallback(() => {
		rafRef.current = null;

		const cssWidth = lastCssWidthRef.current || 1;
		const cursorX = lastCursorXRef.current;

		const fullSpanMs = traceMetadata.endTime - traceMetadata.startTime;

		const oldStart = viewStartRef.current;
		const oldEnd = viewEndRef.current;
		const oldSpan = oldEnd - oldStart;

		const deltaY = wheelDeltaRef.current;
		wheelDeltaRef.current = 0;
		if (deltaY === 0) {
			return;
		}

		const isZoomInGesture = deltaY < 0;

		const zoomIntensityH = lastIsPinchRef.current ? 0.01 : 0.0015;
		// const zoomIntensityV = lastIsPinchRef.current ? 0.02 : 0.003;
		// ✅ slower vertical
		const zoomIntensityV = lastIsPinchRef.current ? 0.008 : 0.001;

		const factorH = Math.exp(deltaY * zoomIntensityH);
		const factorV = Math.exp(deltaY * zoomIntensityV);

		// Desired new values
		const desiredSpan = oldSpan * factorH;

		// zoom-in => bigger rows, zoom-out => smaller rows
		const desiredRow = rowHeightRef.current * (1 / factorV);

		// pixel min based on CURRENT visible span (not full span)
		const minSpanMs = Math.max(5, oldSpan / Math.max(cssWidth, 1));

		const clampWithHit = (value: number, min: number, max: number) => {
			const clamped = Math.max(min, Math.min(max, value));
			return { clamped, hitMin: clamped === min, hitMax: clamped === max };
		};

		const applyHorizontal = (targetSpan: number) => {
			const spanRes = clampWithHit(targetSpan, minSpanMs, fullSpanMs);
			const clampedSpan = spanRes.clamped;

			const cursorRatio = Math.max(0, Math.min(cursorX / cssWidth, 1));
			const anchorTs = oldStart + cursorRatio * oldSpan;
			const newStart = anchorTs - cursorRatio * clampedSpan;

			const finalStart = Math.max(
				traceMetadata.startTime,
				Math.min(newStart, traceMetadata.endTime - clampedSpan),
			);

			return {
				start: finalStart,
				end: finalStart + clampedSpan,
				hitMin: spanRes.hitMin, // reached minSpan (max zoom-in)
				hitMax: spanRes.hitMax, // reached fullSpan (max zoom-out)
			};
		};

		const applyVertical = (targetRow: number) => {
			const rowRes = clampWithHit(targetRow, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT);
			return { row: rowRes.clamped, hitMin: rowRes.hitMin, hitMax: rowRes.hitMax };
		};

		let nextRow = rowHeightRef.current;
		let nextStart = oldStart;
		let nextEnd = oldEnd;

		if (isZoomInGesture) {
			// ✅ Zoom IN: vertical first until MAX_ROW_HEIGHT, then horizontal
			if (rowHeightRef.current < MAX_ROW_HEIGHT) {
				const v = applyVertical(desiredRow);
				nextRow = v.row;

				// Optional: if you want "spillover" in the same wheel gesture once it hits max,
				// you can also apply horizontal when v.hitMax === true (see below).
			} else {
				const h = applyHorizontal(desiredSpan);
				nextStart = h.start;
				nextEnd = h.end;
			}
		} else {
			// ✅ Zoom OUT: horizontal first until fullSpan, then vertical
			if (oldSpan < fullSpanMs) {
				const h = applyHorizontal(desiredSpan);
				nextStart = h.start;
				nextEnd = h.end;

				// Optional spillover: if h.hitMax, then also apply vertical out (see below).
			} else {
				const v = applyVertical(desiredRow);
				nextRow = v.row;
			}
		}

		// Commit
		if (nextRow !== rowHeightRef.current) {
			setRowHeight(nextRow);
		}
		if (nextStart !== oldStart) {
			setViewStartTs(nextStart);
		}
		if (nextEnd !== oldEnd) {
			setViewEndTs(nextEnd);
		}
	}, [traceMetadata]);

	const handleWheel = useCallback(
		(event: React.WheelEvent<HTMLCanvasElement>) => {
			event.preventDefault();

			const pointer = getCanvasPointer(event.clientX, event.clientY);
			if (!pointer) {
				return;
			}

			lastIsPinchRef.current = event.ctrlKey;
			lastCssWidthRef.current = pointer.cssWidth;
			lastCursorXRef.current = pointer.cssX;

			wheelDeltaRef.current += event.deltaY;

			if (rafRef.current == null) {
				rafRef.current = requestAnimationFrame(applyWheelZoom);
			}
		},
		[applyWheelZoom, getCanvasPointer],
	);

	// Reset zoom and pan
	const handleResetZoom = useCallback(() => {
		setViewStartTs(traceMetadata.startTime);
		setViewEndTs(traceMetadata.endTime);
		setRowHeight(DEFAULT_ROW_HEIGHT);
	}, [traceMetadata]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		const onWheel = (e: WheelEvent) => {
			e.preventDefault();

			const pointer = getCanvasPointer(e.clientX, e.clientY);
			if (!pointer) {
				return;
			}

			// if cursor moved enough since last wheel event, flush delta
			if (lastWheelClientXRef.current !== null) {
				const moved = Math.abs(e.clientX - lastWheelClientXRef.current);
				if (moved > 6) {
					wheelDeltaRef.current = 0;
				}
			}
			lastWheelClientXRef.current = e.clientX;

			lastIsPinchRef.current = e.ctrlKey;
			lastCssWidthRef.current = pointer.cssWidth;
			lastCursorXRef.current = pointer.cssX;
			lastCursorYRef.current = pointer.cssY;
			wheelDeltaRef.current += e.deltaY;

			if (rafRef.current == null) {
				rafRef.current = requestAnimationFrame(applyWheelZoom);
			}
		};

		canvas.addEventListener('wheel', onWheel, { passive: false });

		return () => {
			canvas.removeEventListener('wheel', onWheel);
		};
	}, [applyWheelZoom, getCanvasPointer]);

	// // Handle scroll for pagination
	// const handleScroll = useCallback(
	// 	(event: React.UIEvent<HTMLDivElement>): void => {
	// 		const target = event.currentTarget;
	// 		setScrollTop(target.scrollTop);

	// 		// Pagination logic
	// 		if (spans.length < 50) {
	// 			return;
	// 		}

	// 		const scrollPercentage = target.scrollTop / target.scrollHeight;
	// 		const totalLevels = spans.length;

	// 		if (scrollPercentage === 0 && spans[0]?.[0]?.level !== 0) {
	// 			setFirstSpanAtFetchLevel(spans[0][0].spanId);
	// 		}

	// 		if (scrollPercentage >= 0.95 && spans[totalLevels - 1]?.[0]?.spanId) {
	// 			setFirstSpanAtFetchLevel(spans[totalLevels - 1][0].spanId);
	// 		}
	// 	},
	// 	[spans, setFirstSpanAtFetchLevel],
	// );

	// Auto-scroll to selected span
	//TODO: only on load, and should center the span
	useEffect(() => {
		if (!firstSpanAtFetchLevel || !containerRef.current) {
			return;
		}

		const levelIndex = spans.findIndex(
			(level) => level[0]?.spanId === firstSpanAtFetchLevel,
		);

		if (levelIndex !== -1) {
			const targetScroll = levelIndex * ROW_HEIGHT;
			containerRef.current.scrollTop = targetScroll;
			setScrollTop(targetScroll);
		}
	}, [firstSpanAtFetchLevel, spans, ROW_HEIGHT]);

	return (
		<>
			<div
				ref={containerRef}
				className="trace-flamegraph trace-flamegraph-canvas"
				// onScroll={handleScroll}
			>
				{(viewStartTs !== traceMetadata.startTime ||
					viewEndTs !== traceMetadata.endTime) && (
					<Button
						className="flamegraph-reset-zoom"
						size="small"
						onClick={handleResetZoom}
						title="Reset zoom and pan"
					>
						Reset View
					</Button>
				)}
				{isZoomedPastThreshold && (
					<Button
						className="flamegraph-reset-zoom"
						size="small"
						onClick={handleFetchMoreData}
						style={{ marginLeft: 8 }}
					>
						Fetch More Data
					</Button>
				)}
				<canvas
					ref={canvasRef}
					style={{
						display: 'block',
						width: '100%',
						// height: `${totalHeight}px`,
					}}
					onMouseMove={handleMouseMove}
					onMouseDown={handleMouseDown}
					onMouseUp={handleMouseUp}
					onMouseEnter={() => (isOverFlamegraphRef.current = true)}
					onMouseLeave={handleMouseLeave}
					onClick={handleClick}
					// onWheel={handleWheel}
					onContextMenu={(e): void => e.preventDefault()}
				/>
				{tooltipContent && (
					<div
						style={{
							position: 'fixed',
							left: `${tooltipContent.x + 10}px`,
							top: `${tooltipContent.y - 10}px`,
							pointerEvents: 'none',
							zIndex: 1000,
							backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
							color: isDarkMode ? '#ffffff' : '#000000',
							padding: '4px 8px',
							borderRadius: '4px',
							fontSize: '12px',
							boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
						}}
					>
						{tooltipContent.content}
					</div>
				)}
			</div>
			<TimelineV2
				startTimestamp={viewStartTs}
				endTimestamp={viewEndTs}
				offsetTimestamp={viewStartTs - traceMetadata.startTime}
				timelineHeight={22}
			/>
		</>
	);
}

export default Success;

// on drag on click is getting registered as a click
// zoom and scale not matching
// check minimap logic
// use
// const scrollTopRef = useRef(scrollTop);

// useEffect(() => {
//   scrollTopRef.current = scrollTop;
// }, [scrollTop]);

// fix clicks in interaction canvas

// Auto-scroll to selected span else on top(based on default span) on load
// time bar line vertical
// zoom handle vertical and horizontal scroll with proper defined thresholds
// timeline should be in sync with the flamegraph. test with vertical line of time on event etc.
// proper working interaction layer for clicks and hovers
// hit testing should be efficient and accurate without flat spanRect

// Final Priority Order (Clean Summary)
// ✅ Zoom (Horizontal + Vertical thresholds)
// ✅ Timeline sync + vertical time dashed line
// ✅ Minimap brush correctness
// ✅ Auto-scroll behavior
// ✅ Interaction layer separation
// ✅ Efficient hit testing

// handle for missing spans where no end timestamp is present
