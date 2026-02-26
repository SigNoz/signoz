// @ts-nocheck
/* eslint-disable */

/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { ListRange, Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Tooltip } from 'antd';
import Color from 'color';
import TimelineV2 from 'components/TimelineV2/TimelineV2';
import { themeColors } from 'constants/theme';
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';
import { Span } from 'types/api/trace/getTraceV2';
import { toFixed } from 'utils/toFixed';

import './Success.styles.scss';

// Constants for rendering
const ROW_HEIGHT = 24; // 18px height + 6px padding
const SPAN_BAR_HEIGHT = 12;
const EVENT_DOT_SIZE = 6;
const SPAN_BAR_Y_OFFSET = 3; //

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
	const virtuosoRef = useRef<VirtuosoHandle>(null);

	const baseCanvasRef = useRef<HTMLCanvasElement>(null);
	const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
	const minimapRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	console.log('spans.length', spans.length);
	// Calculate total canvas height. this is coming less
	const totalHeight = spans.length * ROW_HEIGHT;

	// Build a flat array of span rectangles for hit testing.
	// consider per level buckets to improve hit testing
	const spanRects = useRef<SpanRect[]>([]);

	// Time window state (instead of zoom/pan in pixel space)
	const [viewStartTs, setViewStartTs] = useState<number>(
		traceMetadata.startTime,
	);
	const [viewEndTs, setViewEndTs] = useState<number>(traceMetadata.endTime);

	const [scrollTop, setScrollTop] = useState<number>(0);

	const [hoveredSpanId, setHoveredSpanId] = useState<string>('');
	const renderSpanLevel = useCallback(
		(_: number, spans: FlamegraphSpan[]): JSX.Element => (
			<div className="flamegraph-row">
				{spans.map((span) => {
					const spread = traceMetadata.endTime - traceMetadata.startTime;
					const leftOffset =
						((span.timestamp - traceMetadata.startTime) * 100) / spread;
					let width = ((span.durationNano / 1e6) * 100) / spread;
					if (width > 100) {
						width = 100;
					}
					const toolTipText = `${span.name}`;
					const searchParams = new URLSearchParams(search);

					let color = generateColor(span.serviceName, themeColors.traceDetailColors);

					const selectedSpanColor = isDarkMode
						? Color(color).lighten(0.7)
						: Color(color).darken(0.7);

					if (span.hasError) {
						color = `var(--bg-cherry-500)`;
					}

					return (
						<Tooltip title={toolTipText} key={span.spanId}>
							<div
								className="span-item"
								style={{
									left: `${leftOffset}%`,
									width: `${width}%`,
									backgroundColor:
										selectedSpan?.spanId === span.spanId || hoveredSpanId === span.spanId
											? `${selectedSpanColor}`
											: color,
								}}
								onMouseEnter={(): void => setHoveredSpanId(span.spanId)}
								onMouseLeave={(): void => setHoveredSpanId('')}
								onClick={(event): void => {
									event.stopPropagation();
									event.preventDefault();
									searchParams.set('spanId', span.spanId);
									history.replace({ search: searchParams.toString() });
								}}
							>
								{span.event?.map((event) => {
									const eventTimeMs = event.timeUnixNano / 1e6;
									const eventOffsetPercent =
										((eventTimeMs - span.timestamp) / (span.durationNano / 1e6)) * 100;
									const clampedOffset = Math.max(1, Math.min(eventOffsetPercent, 99));
									const { isError } = event;
									const { time, timeUnitName } = convertTimeToRelevantUnit(
										eventTimeMs - span.timestamp,
									);
									return (
										<Tooltip
											key={`${span.spanId}-event-${event.name}-${event.timeUnixNano}`}
											title={`${event.name} @ ${toFixed(time, 2)} ${timeUnitName}`}
										>
											<div
												className={`event-dot ${isError ? 'error' : ''}`}
												style={{
													left: `${clampedOffset}%`,
												}}
											/>
										</Tooltip>
									);
								})}
							</div>
						</Tooltip>
					);
				})}
			</div>
		),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[traceMetadata.endTime, traceMetadata.startTime, selectedSpan, hoveredSpanId],
	);

	const handleRangeChanged = useCallback(
		(range: ListRange) => {
			// if there are less than 50 levels on any load that means a single API call is sufficient
			if (spans.length < 50) {
				return;
			}

			const { startIndex, endIndex } = range;
			if (startIndex === 0 && spans[0][0].level !== 0) {
				setFirstSpanAtFetchLevel(spans[0][0].spanId);
			}

			if (endIndex === spans.length - 1) {
				setFirstSpanAtFetchLevel(spans[spans.length - 1][0].spanId);
			}
		},
		[setFirstSpanAtFetchLevel, spans],
	);

	useEffect(() => {
		const index = spans.findIndex(
			(span) => span[0].spanId === firstSpanAtFetchLevel,
		);

		virtuosoRef.current?.scrollToIndex({
			index,
			behavior: 'auto',
		});
	}, [firstSpanAtFetchLevel, spans]);

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

	// Get CSS color value from color string or CSS variable
	// const getColorValue = useCallback((color: string): string => {
	// 	// if (color.startsWith('var(')) {
	// 	// 	// For CSS variables, we need to get computed value
	// 	// 	const tempDiv = document.createElement('div');
	// 	// 	tempDiv.style.color = color;
	// 	// 	document.body.appendChild(tempDiv);
	// 	// 	const computedColor = window.getComputedStyle(tempDiv).color;
	// 	// 	document.body.removeChild(tempDiv);
	// 	// 	return computedColor;
	// 	// }
	// 	return color;
	// }, []);

	// Get span color based on service, error state, and selection
	// separate this when introducing interaction canvas
	const getSpanColor = useCallback(
		(span: FlamegraphSpan): string => {
			let color = generateColor(span.serviceName, themeColors.traceDetailColors);

			if (span.hasError) {
				color = isDarkMode ? 'rgb(239, 68, 68)' : 'rgb(220, 38, 38)';
			}
			// else {
			// 	color = getColorValue(color);
			// }

			// Apply selection/hover highlight
			//hover/selection highlight in getSpanColor forces base redraw. clipping necessary.
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
			// see if we can avoid roundRect as it is performance intensive
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
				// LOD guard: skip events if span too narrow
				// if (width < EVENT_DOT_SIZE) {
				// 	return;
				// }
				drawEventDot(ctx, eventX, eventY, event.isError);
			});
		},
		[getSpanColor, drawEventDot],
	);

	const drawFlamegraph = useCallback(() => {
		const canvas = baseCanvasRef.current;
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
		ctx.clearRect(0, clearTop, cssWidth, clearHeight);

		const spanRectsArray: SpanRect[] = [];

		// ---- Draw only visible levels ----
		for (let levelIndex = firstLevel; levelIndex <= lastLevel; levelIndex++) {
			const levelSpans = spans[levelIndex];
			if (!levelSpans) {
				continue;
			}

			const y = levelIndex * ROW_HEIGHT;

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
	}, [spans, viewStartTs, viewEndTs, scrollTop, drawSpan]);

	// Handle canvas resize with device pixel ratio
	useEffect(() => {
		const canvas = baseCanvasRef.current;
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

	return (
		<>
			<div ref={containerRef} className="trace-flamegraph trace-flamegraph-canvas">
				<canvas ref={baseCanvasRef}></canvas>
			</div>
			<TimelineV2
				startTimestamp={traceMetadata.startTime}
				endTimestamp={traceMetadata.endTime}
				timelineHeight={22}
			/>
		</>
	);
}

export default Success;
