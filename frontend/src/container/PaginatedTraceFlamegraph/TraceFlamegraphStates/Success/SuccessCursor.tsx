// @ts-nocheck
/* eslint-disable */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
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
}

// Constants for rendering
const ROW_HEIGHT = 24; // 18px height + 6px padding
const SPAN_BAR_HEIGHT = 12;
const EVENT_DOT_SIZE = 6;
const SPAN_BAR_Y_OFFSET = 3; // Center the 12px bar in 18px row

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
	} = props;
	const { search } = useLocation();
	const history = useHistory();
	const isDarkMode = useIsDarkMode();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
	const minimapContainerRef = useRef<HTMLDivElement>(null);
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
	const [isDragging, setIsDragging] = useState<boolean>(false);
	const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
		null,
	);
	const [dragDistance, setDragDistance] = useState<number>(0);
	const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

	// Minimap brush state
	const [isBrushDragging, setIsBrushDragging] = useState<boolean>(false);
	const [brushDragStart, setBrushDragStart] = useState<{
		x: number;
		y: number;
		offsetX: number;
		offsetY: number;
	} | null>(null);

	// Build a flat array of span rectangles for hit testing
	const spanRects = useRef<SpanRect[]>([]);

	// Get CSS color value from color string or CSS variable
	const getColorValue = useCallback((color: string): string => {
		if (color.startsWith('var(')) {
			// For CSS variables, we need to get computed value
			const tempDiv = document.createElement('div');
			tempDiv.style.color = color;
			document.body.appendChild(tempDiv);
			const computedColor = window.getComputedStyle(tempDiv).color;
			document.body.removeChild(tempDiv);
			return computedColor;
		}
		return color;
	}, []);

	// Get span color based on service, error state, and selection
	const getSpanColor = useCallback(
		(span: FlamegraphSpan): string => {
			let color = generateColor(span.serviceName, themeColors.traceDetailColors);

			if (span.hasError) {
				color = isDarkMode ? 'rgb(239, 68, 68)' : 'rgb(220, 38, 38)';
			} else {
				color = getColorValue(color);
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
		[isDarkMode, selectedSpan, hoveredSpanId, getColorValue],
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
		[isDarkMode],
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
		[getSpanColor, drawEventDot],
	);

	// Draw the flamegraph on canvas
	const drawFlamegraph = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return;
		}

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Set device pixel ratio for crisp rendering
		const dpr = window.devicePixelRatio || 1;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const timeSpan = viewEndTs - viewStartTs;
		if (timeSpan <= 0) {
			return;
		}

		// Get CSS dimensions (not pixel dimensions)
		const cssWidth = canvas.width / dpr;
		const spanRectsArray: SpanRect[] = [];

		// Draw each level
		spans.forEach((levelSpans, levelIndex) => {
			const y = levelIndex * ROW_HEIGHT;

			// Draw each span in this level
			levelSpans.forEach((span) => {
				const spanStartMs = span.timestamp;
				const spanEndMs = span.timestamp + span.durationNano / 1e6;

				// Skip if span is completely outside visible time window
				if (spanEndMs < viewStartTs || spanStartMs > viewEndTs) {
					return;
				}

				// Calculate position and width in CSS pixels based on time window
				const leftOffset = ((spanStartMs - viewStartTs) / timeSpan) * cssWidth;
				const rightEdge = ((spanEndMs - viewStartTs) / timeSpan) * cssWidth;
				let width = rightEdge - leftOffset;

				// Clamp to visible area
				if (leftOffset < 0) {
					width += leftOffset;
					if (width <= 0) {
						return;
					}
				}
				if (rightEdge > cssWidth) {
					width = cssWidth - Math.max(0, leftOffset);
					if (width <= 0) {
						return;
					}
				}

				// Minimum 1px width for visibility (but this can distort at extreme zoom)
				const minWidth = 1;
				if (width < minWidth && width > 0) {
					width = minWidth;
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
			});
		});

		spanRects.current = spanRectsArray;
	}, [spans, viewStartTs, viewEndTs, drawSpan]);

	// Calculate total canvas height
	const totalHeight = spans.length * ROW_HEIGHT;

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

			// Set CSS size
			canvas.style.width = `${rect.width}px`;
			canvas.style.height = `${totalHeight}px`;

			// Set actual pixel size (accounting for DPR)
			// Only update if size actually changed to prevent unnecessary redraws
			const newWidth = Math.floor(rect.width * dpr);
			const newHeight = Math.floor(totalHeight * dpr);

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
	}, [drawFlamegraph, totalHeight]);

	// Re-draw when data changes
	useEffect(() => {
		drawFlamegraph();
	}, [drawFlamegraph]);

	// Convert screen coordinates to timestamp
	const screenXToTimestamp = useCallback(
		(screenX: number): number => {
			const canvas = canvasRef.current;
			if (!canvas) {
				return viewStartTs;
			}

			const dpr = window.devicePixelRatio || 1;
			const cssWidth = canvas.width / dpr;
			const timeSpan = viewEndTs - viewStartTs;
			return viewStartTs + (screenX / cssWidth) * timeSpan;
		},
		[viewStartTs, viewEndTs],
	);

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

	// Handle mouse move for hover and dragging
	const handleMouseMove = useCallback(
		(event: React.MouseEvent<HTMLCanvasElement>) => {
			const canvas = canvasRef.current;
			if (!canvas) {
				return;
			}

			const rect = canvas.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			const cssX = (event.clientX - rect.left) * (canvas.width / dpr / rect.width);
			const cssY = event.clientY - rect.top + scrollTop;

			// Handle dragging (horizontal pan in time space)
			if (isDragging && dragStart) {
				const deltaX = event.clientX - dragStart.x;
				const deltaY = event.clientY - dragStart.y;
				const totalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
				setDragDistance(totalDistance);

				const timeSpan = viewEndTs - viewStartTs;
				const deltaTime = (deltaX / rect.width) * timeSpan;

				const newStart = viewStartTs - deltaTime;
				const clampedStart = Math.max(
					traceMetadata.startTime,
					Math.min(newStart, traceMetadata.endTime - timeSpan),
				);
				const clampedEnd = clampedStart + timeSpan;

				setViewStartTs(clampedStart);
				setViewEndTs(clampedEnd);
				setDragStart({ x: event.clientX, y: event.clientY });
				return;
			}

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
				// Show grab cursor when not hovering over a span (indicates panning is available)
				canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
			}
		},
		[
			scrollTop,
			findSpanAtPosition,
			isDragging,
			dragStart,
			viewStartTs,
			viewEndTs,
			traceMetadata,
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

	// Handle mouse down for dragging
	const handleMouseDown = useCallback(
		(event: React.MouseEvent<HTMLCanvasElement>) => {
			// Allow dragging with any mouse button (left, middle, right)
			// For left click, we'll distinguish between click and drag based on movement
			if (event.button === 0 || event.button === 1 || event.button === 2) {
				event.preventDefault();
				setIsDragging(true);
				setDragStart({ x: event.clientX, y: event.clientY });
				setDragDistance(0);
				const canvas = canvasRef.current;
				if (canvas) {
					canvas.style.cursor = 'grabbing';
				}
			}
		},
		[],
	);

	// Handle mouse up
	const handleMouseUp = useCallback(() => {
		const dragDist = dragDistance;
		setIsDragging(false);
		setDragStart(null);
		setDragDistance(0);
		const canvas = canvasRef.current;
		if (canvas) {
			canvas.style.cursor = 'default';
		}
		// If we dragged more than 5px, it was a drag, not a click
		// This prevents click events after dragging
		return dragDist > 5;
	}, [dragDistance]);

	// Handle mouse leave
	const handleMouseLeave = useCallback(() => {
		setHoveredSpanId('');
		setTooltipContent(null);
		setIsDragging(false);
		setDragStart(null);
		const canvas = canvasRef.current;
		if (canvas) {
			canvas.style.cursor = 'default';
		}
	}, []);

	// Handle click
	const handleClick = useCallback(
		(event: React.MouseEvent<HTMLCanvasElement>) => {
			// Don't trigger click if we dragged (moved more than 5px)
			if (dragDistance > 5) {
				return;
			}

			const canvas = canvasRef.current;
			if (!canvas) {
				return;
			}

			const rect = canvas.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			const cssX = (event.clientX - rect.left) * (canvas.width / dpr / rect.width);
			const cssY = event.clientY - rect.top + scrollTop;

			const clickedSpan = findSpanAtPosition(cssX, cssY);

			if (clickedSpan) {
				const searchParams = new URLSearchParams(search);
				searchParams.set('spanId', clickedSpan.span.spanId);
				history.replace({ search: searchParams.toString() });
			}
		},
		[search, history, scrollTop, findSpanAtPosition, dragDistance],
	);

	// Handle wheel for zooming (in time space)
	const handleWheel = useCallback(
		(event: React.WheelEvent<HTMLCanvasElement>) => {
			event.preventDefault();

			const canvas = canvasRef.current;
			if (!canvas) {
				return;
			}

			const rect = canvas.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			const cssWidth = canvas.width / dpr;
			const cursorX = (event.clientX - rect.left) * (cssWidth / rect.width);

			// Convert cursor position to timestamp (anchor time)
			const anchorTs = screenXToTimestamp(cursorX);

			// Zoom factor
			const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;

			// Compute new time window
			const oldSpan = viewEndTs - viewStartTs;
			const newSpan = oldSpan * zoomFactor;

			// Clamp zoom level (min/max time window)
			const minSpan = (traceMetadata.endTime - traceMetadata.startTime) / 100; // Max 100x zoom in
			const maxSpan = traceMetadata.endTime - traceMetadata.startTime; // Full trace
			const clampedSpan = Math.max(minSpan, Math.min(maxSpan, newSpan));

			// Choose new window so anchorTs maps back to same cursorX
			const newViewStart = anchorTs - (cursorX / cssWidth) * clampedSpan;

			// Clamp to trace bounds
			const finalStart = Math.max(
				traceMetadata.startTime,
				Math.min(newViewStart, traceMetadata.endTime - clampedSpan),
			);
			const finalEnd = finalStart + clampedSpan;

			setViewStartTs(finalStart);
			setViewEndTs(finalEnd);
		},
		[viewStartTs, viewEndTs, traceMetadata, screenXToTimestamp],
	);

	// Reset zoom and pan
	const handleResetZoom = useCallback(() => {
		setViewStartTs(traceMetadata.startTime);
		setViewEndTs(traceMetadata.endTime);
	}, [traceMetadata]);

	// Handle scroll for pagination
	const handleScroll = useCallback(
		(event: React.UIEvent<HTMLDivElement>): void => {
			const target = event.currentTarget;
			setScrollTop(target.scrollTop);

			// Pagination logic
			if (spans.length < 50) {
				return;
			}

			const scrollPercentage = target.scrollTop / target.scrollHeight;
			const totalLevels = spans.length;

			if (scrollPercentage === 0 && spans[0]?.[0]?.level !== 0) {
				setFirstSpanAtFetchLevel(spans[0][0].spanId);
			}

			if (scrollPercentage >= 0.95 && spans[totalLevels - 1]?.[0]?.spanId) {
				setFirstSpanAtFetchLevel(spans[totalLevels - 1][0].spanId);
			}
		},
		[spans, setFirstSpanAtFetchLevel],
	);

	// Auto-scroll to selected span
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
	}, [firstSpanAtFetchLevel, spans]);

	// Minimap constants
	const MINIMAP_HEIGHT = 42; // Fixed height for minimap

	// Draw minimap with 2D density heatmap (time x levels)
	const drawMinimap = useCallback(() => {
		const canvas = minimapCanvasRef.current;
		if (!canvas) {
			return;
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return;
		}

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Set device pixel ratio
		const dpr = window.devicePixelRatio || 1;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const fullTimeSpan = traceMetadata.endTime - traceMetadata.startTime;
		if (fullTimeSpan <= 0) {
			return;
		}

		const cssWidth = canvas.width / dpr;
		const cssHeight = canvas.height / dpr;
		const totalLevels = spans.length;

		// Create 2D density grid (time buckets x level buckets)
		const timeBucketCount = Math.floor(cssWidth);
		const levelBucketCount = Math.floor(cssHeight);
		const densityGrid: number[][] = Array(levelBucketCount)
			.fill(0)
			.map(() => Array(timeBucketCount).fill(0));

		// Count spans in each grid cell
		spans.forEach((levelSpans, levelIndex) => {
			const levelBucket = Math.floor(
				(levelIndex / totalLevels) * levelBucketCount,
			);
			if (levelBucket >= 0 && levelBucket < levelBucketCount) {
				levelSpans.forEach((span) => {
					const spanStartMs = span.timestamp;
					const spanEndMs = span.timestamp + span.durationNano / 1e6;
					const startBucket = Math.floor(
						((spanStartMs - traceMetadata.startTime) / fullTimeSpan) *
							timeBucketCount,
					);
					const endBucket = Math.ceil(
						((spanEndMs - traceMetadata.startTime) / fullTimeSpan) * timeBucketCount,
					);

					for (
						let i = Math.max(0, startBucket);
						i < Math.min(timeBucketCount, endBucket);
						i++
					) {
						if (densityGrid[levelBucket]) {
							densityGrid[levelBucket][i]++;
						}
					}
				});
			}
		});

		// Find max density for normalization
		let maxDensity = 1;
		densityGrid.forEach((row) => {
			row.forEach((density) => {
				if (density > maxDensity) {
					maxDensity = density;
				}
			});
		});

		// Draw 2D heatmap
		const cellWidth = cssWidth / timeBucketCount;
		const cellHeight = cssHeight / levelBucketCount;
		const bgColor = isDarkMode ? '#1f2937' : '#f3f4f6';
		const highlightColor = isDarkMode ? '#60a5fa' : '#3b82f6';

		// Background
		ctx.fillStyle = bgColor;
		ctx.fillRect(0, 0, cssWidth, cssHeight);

		// Draw heatmap cells
		densityGrid.forEach((row, levelIdx) => {
			row.forEach((density, timeIdx) => {
				if (density > 0) {
					const intensity = density / maxDensity;
					// Use gradient from light to dark based on density
					const alpha = Math.min(0.8, 0.2 + intensity * 0.6);
					ctx.fillStyle = isDarkMode
						? `rgba(96, 165, 250, ${alpha})`
						: `rgba(59, 130, 246, ${alpha})`;
					ctx.fillRect(
						timeIdx * cellWidth,
						levelIdx * cellHeight,
						cellWidth,
						cellHeight,
					);
				}
			});
		});

		// Draw view window indicator (brush rectangle)
		const viewStartPercent =
			((viewStartTs - traceMetadata.startTime) / fullTimeSpan) * 100;
		const viewEndPercent =
			((viewEndTs - traceMetadata.startTime) / fullTimeSpan) * 100;
		const brushLeft = (viewStartPercent / 100) * cssWidth;
		const brushWidth = ((viewEndPercent - viewStartPercent) / 100) * cssWidth;

		// Calculate vertical brush position based on scroll
		const container = containerRef.current;
		const visibleHeight = container ? container.clientHeight : cssHeight;
		const brushTop = (scrollTop / totalHeight) * cssHeight;
		const brushHeight = (visibleHeight / totalHeight) * cssHeight;

		// Draw brush overlay (semi-transparent)
		ctx.fillStyle = isDarkMode
			? 'rgba(96, 165, 250, 0.3)'
			: 'rgba(59, 130, 246, 0.3)';
		ctx.fillRect(brushLeft, brushTop, brushWidth, brushHeight);

		// Draw brush borders
		ctx.strokeStyle = highlightColor;
		ctx.lineWidth = 2;
		ctx.strokeRect(brushLeft, brushTop, brushWidth, brushHeight);
	}, [
		spans,
		traceMetadata,
		viewStartTs,
		viewEndTs,
		scrollTop,
		totalHeight,
		isDarkMode,
	]);

	// Handle minimap brush resize
	useEffect(() => {
		const minimap = minimapContainerRef.current;
		if (!minimap) {
			return;
		}

		const updateMinimapSize = (): void => {
			const canvas = minimapCanvasRef.current;
			if (!canvas) {
				return;
			}

			const rect = minimap.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;

			canvas.style.width = `${rect.width}px`;
			canvas.style.height = `${MINIMAP_HEIGHT}px`;
			canvas.width = Math.floor(rect.width * dpr);
			canvas.height = Math.floor(MINIMAP_HEIGHT * dpr);

			drawMinimap();
		};

		const resizeObserver = new ResizeObserver(updateMinimapSize);
		resizeObserver.observe(minimap);

		updateMinimapSize();

		return (): void => {
			resizeObserver.disconnect();
		};
	}, [drawMinimap]);

	// Redraw minimap when view changes
	useEffect(() => {
		drawMinimap();
	}, [drawMinimap]);

	// Handle minimap brush drag start
	const handleMinimapBrushMouseDown = useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			event.preventDefault();
			const minimap = minimapContainerRef.current;
			const container = containerRef.current;
			if (!minimap || !container) {
				return;
			}

			const rect = minimap.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const y = event.clientY - rect.top;
			const fullTimeSpan = traceMetadata.endTime - traceMetadata.startTime;
			const viewTimeSpan = viewEndTs - viewStartTs;
			const visibleHeight = container.clientHeight;

			// Calculate brush position
			const brushLeftPercent =
				((viewStartTs - traceMetadata.startTime) / fullTimeSpan) * 100;
			const brushLeft = (brushLeftPercent / 100) * rect.width;
			const brushWidth = (viewTimeSpan / fullTimeSpan) * rect.width;
			const brushTop = (scrollTop / totalHeight) * rect.height;
			const brushHeight = (visibleHeight / totalHeight) * rect.height;

			// Check if click is on the brush (both X and Y)
			if (
				x >= brushLeft &&
				x <= brushLeft + brushWidth &&
				y >= brushTop &&
				y <= brushTop + brushHeight
			) {
				setIsBrushDragging(true);
				setBrushDragStart({
					x: event.clientX,
					y: event.clientY,
					offsetX: x - brushLeft,
					offsetY: y - brushTop,
				});
			}
		},
		[traceMetadata, viewStartTs, viewEndTs, scrollTop, totalHeight],
	);

	// Handle minimap brush drag
	const handleMinimapBrushMouseMove = useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			if (!isBrushDragging || !brushDragStart) {
				return;
			}

			const minimap = minimapContainerRef.current;
			const container = containerRef.current;
			if (!minimap || !container) {
				return;
			}

			const rect = minimap.getBoundingClientRect();
			const deltaX = event.clientX - brushDragStart.x;
			const deltaY = event.clientY - brushDragStart.y;
			const fullTimeSpan = traceMetadata.endTime - traceMetadata.startTime;
			const viewTimeSpan = viewEndTs - viewStartTs;
			const visibleHeight = container.clientHeight;

			// Convert pixel delta to time delta (horizontal pan)
			const deltaTime = (deltaX / rect.width) * fullTimeSpan;
			const newStart = viewStartTs + deltaTime;
			const clampedStart = Math.max(
				traceMetadata.startTime,
				Math.min(newStart, traceMetadata.endTime - viewTimeSpan),
			);
			const clampedEnd = clampedStart + viewTimeSpan;

			// Convert pixel delta to scroll delta (vertical pan)
			const deltaScroll = (deltaY / rect.height) * totalHeight;
			const newScrollTop = Math.max(
				0,
				Math.min(scrollTop + deltaScroll, totalHeight - visibleHeight),
			);

			setViewStartTs(clampedStart);
			setViewEndTs(clampedEnd);
			setScrollTop(newScrollTop);
			if (container) {
				container.scrollTop = newScrollTop;
			}
			setBrushDragStart({
				x: event.clientX,
				y: event.clientY,
				offsetX: brushDragStart.offsetX,
				offsetY: brushDragStart.offsetY,
			});
		},
		[
			isBrushDragging,
			brushDragStart,
			traceMetadata,
			viewStartTs,
			viewEndTs,
			scrollTop,
			totalHeight,
		],
	);

	// Handle minimap brush drag end
	const handleMinimapBrushMouseUp = useCallback(() => {
		setIsBrushDragging(false);
		setBrushDragStart(null);
	}, []);

	// Calculate brush position and size for overlay (2D rectangle)
	const brushStyle = useMemo(() => {
		const fullTimeSpan = traceMetadata.endTime - traceMetadata.startTime;
		if (fullTimeSpan <= 0) {
			return { display: 'none' };
		}

		const container = containerRef.current;
		const visibleHeight = container ? container.clientHeight : MINIMAP_HEIGHT;

		const viewTimeSpan = viewEndTs - viewStartTs;
		const leftPercent =
			((viewStartTs - traceMetadata.startTime) / fullTimeSpan) * 100;
		const widthPercent = (viewTimeSpan / fullTimeSpan) * 100;
		const topPercent = (scrollTop / totalHeight) * 100;
		const heightPercent = (visibleHeight / totalHeight) * 100;

		return {
			left: `${leftPercent}%`,
			width: `${widthPercent}%`,
			top: `${topPercent}%`,
			height: `${heightPercent}%`,
		};
	}, [traceMetadata, viewStartTs, viewEndTs, scrollTop, totalHeight]);

	return (
		<>
			<div
				ref={containerRef}
				className="trace-flamegraph trace-flamegraph-canvas"
				onScroll={handleScroll}
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
				<canvas
					ref={canvasRef}
					style={{
						display: 'block',
						width: '100%',
						height: `${totalHeight}px`,
						cursor: isDragging ? 'grabbing' : isSpacePressed ? 'grab' : 'default',
					}}
					onMouseMove={handleMouseMove}
					onMouseDown={handleMouseDown}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseLeave}
					onClick={handleClick}
					onWheel={handleWheel}
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
			<div
				ref={minimapContainerRef}
				className="flamegraph-minimap"
				onMouseDown={handleMinimapBrushMouseDown}
				onMouseMove={handleMinimapBrushMouseMove}
				onMouseUp={handleMinimapBrushMouseUp}
				onMouseLeave={handleMinimapBrushMouseUp}
			>
				<canvas
					ref={minimapCanvasRef}
					style={{
						display: 'block',
						width: '100%',
						height: `${MINIMAP_HEIGHT}px`,
						cursor: isBrushDragging ? 'grabbing' : 'grab',
					}}
				/>
				<div className="flamegraph-minimap-brush" style={brushStyle} />
			</div>
			<TimelineV2
				startTimestamp={viewStartTs}
				endTimestamp={viewEndTs}
				timelineHeight={22}
			/>
		</>
	);
}

export default Success;
