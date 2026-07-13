/* eslint-disable sonarjs/cognitive-complexity */
import {
	Dispatch,
	memo,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import {
	TooltipRoot,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui/tooltip';
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer, Virtualizer } from '@tanstack/react-virtual';
import cx from 'classnames';
import HttpStatusBadge from 'components/HttpStatusBadge/HttpStatusBadge';
import TimelineV3 from 'components/TimelineV3/TimelineV3';
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import { useCopySpanLink } from 'hooks/trace/useCopySpanLink';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { colorToRgb } from 'lib/uPlotLib/utils/generateColor';
import { ChevronDown, ChevronRight, Link, ListPlus } from '@signozhq/icons';
import { useTraceStore } from 'pages/TraceDetailsV3/stores/traceStore';
import { resolveSpanColor } from 'pages/TraceDetailsV3/utils';
import { useBoundaryPagination } from 'pages/TraceDetailsV3/TraceWaterfall/hooks/useBoundaryPagination';
import { useCrosshair } from 'pages/TraceDetailsV3/hooks/useCrosshair';
import { ResizableBox } from 'periscope/components/ResizableBox';
import { EventV3, SpanV3 } from 'types/api/trace/getTraceV3';
import { toFixed } from 'utils/toFixed';

import { EventTooltipContent } from '../../../SpanHoverCard/EventTooltipContent';
import { SpanHoverCard } from '../../../SpanHoverCard/SpanHoverCard';
import AddSpanToFunnelModal from '../../AddSpanToFunnelModal/AddSpanToFunnelModal';
import { IInterestedSpan } from '../../types';

import styles from './Success.module.scss';

/**
 * Lazy event dot — only mounts the tooltip when the user hovers.
 * Avoids mounting N tooltip instances per row during fast scroll.
 */
const LazyEventDotPopover = memo(function LazyEventDotPopover({
	event,
	spanTimestamp,
	dotLeft,
	isError,
	dotBg,
	dotBorder,
}: {
	event: EventV3;
	spanTimestamp: number;
	dotLeft: number;
	isError: boolean;
	dotBg: string;
	dotBorder: string;
}): JSX.Element {
	const [showPopover, setShowPopover] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleMouseEnter = useCallback((): void => {
		timerRef.current = setTimeout(() => setShowPopover(true), 200);
	}, []);

	const handleMouseLeave = useCallback((): void => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		setShowPopover(false);
	}, []);

	const dot = (
		<div
			className={cx(styles.eventDot, isError && styles.hasError)}
			style={
				{
					left: `${dotLeft}%`,
					'--event-dot-bg': isError ? undefined : dotBg,
					'--event-dot-border': isError ? undefined : dotBorder,
				} as React.CSSProperties
			}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		/>
	);

	if (!showPopover) {
		return dot;
	}

	const eventTimeMs = event.timeUnixNano / 1e6;

	return (
		<TooltipProvider>
			<TooltipRoot
				open
				onOpenChange={(open: boolean): void => {
					if (!open) {
						setShowPopover(false);
					}
				}}
			>
				<TooltipTrigger asChild>{dot}</TooltipTrigger>
				<TooltipContent className={styles.popover}>
					<EventTooltipContent
						eventName={event.name}
						timeOffsetMs={eventTimeMs - spanTimestamp}
						isError={isError}
						attributeMap={event.attributeMap || {}}
					/>
				</TooltipContent>
			</TooltipRoot>
		</TooltipProvider>
	);
});

// css config
const CONNECTOR_WIDTH = 30;
const VERTICAL_CONNECTOR_WIDTH = 1;

interface SpanStateClasses {
	isSelected: boolean;
	isDimmed: boolean;
	isHighlighted: boolean;
	isSelectedNonMatching: boolean;
	isMatching: boolean;
}

function getSpanStateClasses(
	spanId: string,
	selectedSpan: SpanV3 | undefined,
	filteredSpanIds: string[],
	isFilterActive: boolean,
): SpanStateClasses {
	const isMatching = isFilterActive && (filteredSpanIds || []).includes(spanId);
	const isSelected = selectedSpan?.span_id === spanId;
	const isDimmed = isFilterActive && !isMatching && !isSelected;
	const isHighlighted = isFilterActive && isMatching && !isSelected;
	const isSelectedNonMatching = isSelected && isFilterActive && !isMatching;
	return {
		isSelected,
		isDimmed,
		isHighlighted,
		isSelectedNonMatching,
		isMatching,
	};
}

interface ITraceMetadata {
	traceId: string;
	startTime: number;
	endTime: number;
	hasMissingSpans: boolean;
}
interface ISuccessProps {
	spans: SpanV3[];
	traceMetadata: ITraceMetadata;
	interestedSpanId: IInterestedSpan;
	uncollapsedNodes: string[];
	isFullDataLoaded: boolean;
	localUncollapsedNodes: Set<string>;
	setLocalUncollapsedNodes: Dispatch<SetStateAction<Set<string>>>;
	setInterestedSpanId: Dispatch<SetStateAction<IInterestedSpan>>;
	selectedSpan: SpanV3 | undefined;
	setSelectedSpan: Dispatch<SetStateAction<SpanV3 | undefined>>;
	filteredSpanIds: string[];
	isFilterActive: boolean;
	isFetching?: boolean;
}

const SpanOverview = memo(function SpanOverview({
	span,
	isSpanCollapsed,
	handleCollapseUncollapse,
	handleSpanClick,
	selectedSpan,
	filteredSpanIds,
	isFilterActive,
	onAddSpanToFunnel,
	onHoverEnter,
	onHoverLeave,
}: {
	span: SpanV3;
	isSpanCollapsed: boolean;
	handleCollapseUncollapse: (id: string, collapse: boolean) => void;
	selectedSpan: SpanV3 | undefined;
	handleSpanClick: (span: SpanV3) => void;
	filteredSpanIds: string[];
	isFilterActive: boolean;
	onAddSpanToFunnel: (span: SpanV3) => void;
	onHoverEnter: (spanId: string) => void;
	onHoverLeave: () => void;
}): JSX.Element {
	const isRootSpan = span.level === 0;
	const { onSpanCopy } = useCopySpanLink(span);
	const colorByFieldName = useTraceStore((s) => s.colorByField.name);
	const isDarkMode = useIsDarkMode();

	const { color, colorDark } = resolveSpanColor(span, colorByFieldName);
	// Single theme-resolved color: bright base in dark mode, darkened variant in
	// light mode so the dot stands out against the white panel.
	const effectiveColor = isDarkMode ? color : colorDark;

	// Smart highlighting logic
	const {
		isSelected,
		isDimmed,
		isHighlighted,
		isSelectedNonMatching,
		isMatching,
	} = getSpanStateClasses(
		span.span_id,
		selectedSpan,
		filteredSpanIds,
		isFilterActive,
	);

	// All siblings at the same level share the same indent so the "same X =
	// same level" visual rule holds. Parent/child distinction is conveyed by
	// the chevron and the L-connector, not by an icon-X offset.
	const indentWidth = isRootSpan ? 0 : span.level * CONNECTOR_WIDTH;

	const handleFunnelClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
		e.stopPropagation();
		onAddSpanToFunnel(span);
	};

	// e2e hook: expose the filter highlight/dim state as a stable attribute, since
	// the styles.* classes are hashed at build time and can't be asserted.
	let spanState = 'default';
	if (isHighlighted) {
		spanState = 'highlighted';
	} else if (isDimmed) {
		spanState = 'dimmed';
	} else if (isSelectedNonMatching) {
		spanState = 'selected-non-matching';
	} else if (isSelected) {
		spanState = 'selected';
	}

	return (
		<div
			className={cx(styles.spanOverview, {
				[styles.isInterested]: isSelected && (!isFilterActive || isMatching),
				[styles.isHighlighted]: isHighlighted,
				[styles.isSelectedNonMatching]: isSelectedNonMatching,
				[styles.isDimmed]: isDimmed,
			})}
			data-span-state={spanState}
			onClick={(): void => handleSpanClick(span)}
			onMouseEnter={(): void => onHoverEnter(span.span_id)}
			onMouseLeave={(): void => onHoverLeave()}
		>
			{/* Tree connector lines — always draw vertical lines at all ancestor levels + L-connector */}
			{!isRootSpan &&
				Array.from({ length: span.level }, (_, i) => {
					const lvl = i + 1;
					const xPos = (lvl - 1) * CONNECTOR_WIDTH + 9;
					if (lvl < span.level) {
						// Stop the line at 50% for the last child's parent level
						const isLastChildParentLine = !span.has_sibling && lvl === span.level - 1;
						return (
							<div
								key={lvl}
								className={styles.treeLine}
								style={{
									left: xPos,
									top: 0,
									width: 1,
									height: isLastChildParentLine ? '50%' : '100%',
								}}
							/>
						);
					}
					return (
						<div key={lvl}>
							<div
								className={styles.treeLine}
								style={{ left: xPos, top: 0, width: 1, height: '50%' }}
							/>
							<div className={styles.treeConnector} style={{ left: xPos, top: 0 }} />
						</div>
					);
				})}

			{/* Indent spacer */}
			<span className={styles.treeIndent} style={{ width: `${indentWidth}px` }} />

			{/* Expand/collapse arrow + child count slots — always render the
				    slots, fill them only when the span has children. Reserving the
				    horizontal space on leaf rows aligns sibling icons regardless
				    of whether each sibling is a parent or a leaf. */}
			<span className={styles.treeArrowSlot}>
				{span.has_children && (
					<span
						className={styles.treeArrow}
						data-testid={`cell-collapse-${span.span_id}`}
						onClick={(event): void => {
							event.stopPropagation();
							event.preventDefault();
							handleCollapseUncollapse(span.span_id, !isSpanCollapsed);
						}}
					>
						{isSpanCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
					</span>
				)}
			</span>
			<span className={styles.subtreeCountSlot}>
				{span.has_children && (
					<span className={styles.subtreeCount}>
						<Badge color="vanilla">{span.sub_tree_node_count}</Badge>
					</span>
				)}
			</span>

			{/* Colored service dot */}
			<span
				className={cx(styles.treeIcon, { [styles.hasError]: span.has_error })}
				style={
					{
						'--service-dot-color': effectiveColor,
					} as React.CSSProperties
				}
			/>

			{/* Span name + service name */}
			<span className={styles.treeLabel}>
				{span.name}
				<span className={styles.treeServiceName}>{span['service.name']}</span>
			</span>

			{/* Action buttons — shown on hover via CSS, right-aligned */}
			<span className={styles.rowActions}>
				<TooltipProvider delayDuration={200}>
					<TooltipRoot>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								color="secondary"
								className={styles.actionBtn}
								onClick={onSpanCopy}
							>
								<Link size={12} />
							</Button>
						</TooltipTrigger>
						<TooltipContent className={styles.actionTooltip}>
							Copy Span Link
						</TooltipContent>
					</TooltipRoot>
					<TooltipRoot>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								color="secondary"
								className={styles.actionBtn}
								onClick={handleFunnelClick}
							>
								<ListPlus size={12} />
							</Button>
						</TooltipTrigger>
						<TooltipContent className={styles.actionTooltip}>
							Add to Trace Funnel
						</TooltipContent>
					</TooltipRoot>
				</TooltipProvider>
			</span>
		</div>
	);
});

export const SpanDuration = memo(function SpanDuration({
	span,
	traceMetadata,
	handleSpanClick,
	selectedSpan,
	filteredSpanIds,
	isFilterActive,
}: {
	span: SpanV3;
	traceMetadata: ITraceMetadata;
	selectedSpan: SpanV3 | undefined;
	handleSpanClick: (span: SpanV3) => void;
	filteredSpanIds: string[];
	isFilterActive: boolean;
}): JSX.Element {
	const { time, timeUnitName } = convertTimeToRelevantUnit(
		span.duration_nano / 1e6,
	);

	const spread = traceMetadata.endTime - traceMetadata.startTime;
	const leftOffset = ((span.timestamp - traceMetadata.startTime) * 1e2) / spread;
	const width = (span.duration_nano * 1e2) / (spread * 1e6);

	const colorByFieldName = useTraceStore((s) => s.colorByField.name);
	const isDarkMode = useIsDarkMode();
	const { color, colorDark } = resolveSpanColor(span, colorByFieldName);
	// Single theme-resolved color: bright base in dark mode, darkened variant in
	// light mode (so the bar stands out against the white panel and hover/selected
	// foregrounds stay legible). The bar's text flips dark↔white to suit the fill.
	const effectiveColor = isDarkMode ? color : colorDark;
	const rgbColor = colorToRgb(effectiveColor);
	const spanTextColor = isDarkMode
		? 'rgba(0, 0, 0, 0.7)'
		: 'rgba(255, 255, 255, 0.95)';

	const {
		isSelected,
		isDimmed,
		isHighlighted,
		isSelectedNonMatching,
		isMatching,
	} = getSpanStateClasses(
		span.span_id,
		selectedSpan,
		filteredSpanIds,
		isFilterActive,
	);

	return (
		<div
			className={cx(styles.spanDuration, {
				[styles.isInterested]: isSelected && (!isFilterActive || isMatching),
				[styles.isHighlighted]: isHighlighted,
				[styles.isSelectedNonMatching]: isSelectedNonMatching,
				[styles.isDimmed]: isDimmed,
			})}
			onClick={(): void => handleSpanClick(span)}
		>
			<div
				className={styles.spanBar}
				style={
					{
						left: `${leftOffset}%`,
						width: `${width}%`,
						'--span-color': effectiveColor,
						'--span-color-rgb': rgbColor,
						'--span-text-color': spanTextColor,
					} as React.CSSProperties
				}
			>
				<span className={styles.spanInfo}>
					<span className={styles.spanName}>{span.name}</span>
					<span className={styles.spanDurationText}>{`${toFixed(
						time,
						2,
					)} ${timeUnitName}`}</span>
				</span>
			</div>
			{span.events?.map((event) => {
				const eventTimeMs = event.timeUnixNano / 1e6;
				const spanDurationMs = span.duration_nano / 1e6;
				const eventOffsetPercent =
					((eventTimeMs - span.timestamp) / spanDurationMs) * 100;
				const clampedOffset = Math.max(1, Math.min(eventOffsetPercent, 99));
				const { isError } = event;
				// Position relative to the span bar: leftOffset% + clampedOffset% of width%
				const dotLeft = leftOffset + (clampedOffset / 100) * width;
				const parts = rgbColor.split(', ');
				const dotBg = `rgb(${parts
					.map((c) => Math.round(Number(c) * 0.7))
					.join(', ')})`;
				const dotBorder = `rgb(${parts
					.map((c) => Math.round(Number(c) * 0.5))
					.join(', ')})`;
				return (
					<LazyEventDotPopover
						key={`${span.span_id}-event-${event.name}-${event.timeUnixNano}`}
						event={event}
						spanTimestamp={span.timestamp}
						dotLeft={dotLeft}
						isError={isError}
						dotBg={dotBg}
						dotBorder={dotBorder}
					/>
				);
			})}
		</div>
	);
});

// table config
const columnDefHelper = createColumnHelper<SpanV3>();

const ROW_HEIGHT = 28;
const WATERFALL_BOTTOM_PADDING = 24;
const DEFAULT_SIDEBAR_WIDTH = 450;
const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 900;
const BASE_CONTENT_WIDTH = 300;

function Success(props: ISuccessProps): JSX.Element {
	const {
		spans,
		traceMetadata,
		interestedSpanId,
		uncollapsedNodes,
		isFullDataLoaded,
		localUncollapsedNodes,
		setLocalUncollapsedNodes,
		setInterestedSpanId,
		setSelectedSpan,
		selectedSpan,
		filteredSpanIds,
		isFilterActive,
		isFetching,
	} = props;

	const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const timelineAreaRef = useRef<HTMLDivElement>(null);
	const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element>>();
	const prevHoveredSpanIdRef = useRef<string | null>(null);
	const autoScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const {
		topSentinelRef: loadMoreTopSentinelRef,
		bottomSentinelRef: loadMoreBottomSentinelRef,
	} = useBoundaryPagination({
		scrollContainerRef,
		spans,
		isFetching,
		isFullDataLoaded,
		setInterestedSpanId,
	});

	const {
		cursorXPercent,
		cursorX,
		onMouseMove: onCrosshairMove,
		onMouseLeave: onCrosshairLeave,
		// Rows are padded 0 15px while `.timeline` spans full width — inset the
		// crosshair by the same 15px so it aligns with the ruler ticks and bars.
	} = useCrosshair({ containerRef: timelineAreaRef, insetX: 15 });

	// Imperative DOM class toggling for hover highlights (avoids React re-renders)
	const applyHoverClass = useCallback((spanId: string | null): void => {
		const prev = prevHoveredSpanIdRef.current;
		if (prev === spanId) {
			return;
		}

		if (prev) {
			const prevElements = document.querySelectorAll(`[data-span-id="${prev}"]`);
			prevElements.forEach((el) => el.classList.remove(styles.hoveredSpan));
		}
		if (spanId) {
			const nextElements = document.querySelectorAll(`[data-span-id="${spanId}"]`);
			nextElements.forEach((el) => el.classList.add(styles.hoveredSpan));
		}
		prevHoveredSpanIdRef.current = spanId;
	}, []);

	// Hover-card state — single popover anchored at the sidebar/timeline
	// boundary, Y tracks the hovered row. Set after a 500 ms debounce so fast
	// scrolls/cursor sweeps don't fire the card.
	const [hoveredSpanId, setHoveredSpanId] = useState<string | null>(null);
	const hoverDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleRowMouseEnter = useCallback(
		(spanId: string): void => {
			applyHoverClass(spanId);
			if (hoverDelayTimerRef.current) {
				clearTimeout(hoverDelayTimerRef.current);
			}
			hoverDelayTimerRef.current = setTimeout(() => {
				setHoveredSpanId(spanId);
			}, 500);
		},
		[applyHoverClass],
	);

	const handleRowMouseLeave = useCallback((): void => {
		applyHoverClass(null);
		if (hoverDelayTimerRef.current) {
			clearTimeout(hoverDelayTimerRef.current);
			hoverDelayTimerRef.current = null;
		}
		setHoveredSpanId(null);
	}, [applyHoverClass]);

	const handleCollapseUncollapse = useCallback(
		(spanId: string, collapse: boolean) => {
			if (isFullDataLoaded) {
				// Frontend mode: toggle local state, no API call
				setLocalUncollapsedNodes((prev) => {
					const next = new Set(prev);
					if (collapse) {
						next.delete(spanId);
					} else {
						next.add(spanId);
					}
					return next;
				});
				return;
			}
			// Backend mode: trigger refetch via interestedSpanId
			setInterestedSpanId({
				spanId,
				isUncollapsed: !collapse,
			});
		},
		[isFullDataLoaded, setLocalUncollapsedNodes, setInterestedSpanId],
	);

	const handleVirtualizerInstanceChanged = useCallback(
		(instance: Virtualizer<HTMLDivElement, Element>): void => {
			const { range } = instance;

			// Auto-scroll sidebar horizontally to keep span names visible as depth changes.
			// Debounced — only fires 50ms after scrolling settles to avoid jitter.
			// Prefer the hovered span's level, else fall back to the median visible span.
			if (range && instance.isScrolling) {
				if (autoScrollTimerRef.current) {
					clearTimeout(autoScrollTimerRef.current);
				}

				const capturedRange = { ...range };
				autoScrollTimerRef.current = setTimeout(() => {
					const hoveredId = prevHoveredSpanIdRef.current;
					let targetLevel: number | null = null;

					if (hoveredId) {
						const hoveredIdx = spans.findIndex((s) => s.span_id === hoveredId);
						if (
							hoveredIdx >= capturedRange.startIndex &&
							hoveredIdx <= capturedRange.endIndex
						) {
							targetLevel = spans[hoveredIdx].level;
						}
					}

					if (targetLevel === null) {
						const midIndex = Math.floor(
							(capturedRange.startIndex + capturedRange.endIndex) / 2,
						);
						targetLevel = spans[midIndex]?.level ?? 0;
					}

					const sidebarScrollEl = scrollContainerRef.current?.querySelector(
						'.resizable-box__content',
					);
					if (sidebarScrollEl) {
						const targetScrollLeft = Math.max(0, targetLevel * CONNECTOR_WIDTH - 40);
						if (
							Math.abs(sidebarScrollEl.scrollLeft - targetScrollLeft) >
							CONNECTOR_WIDTH * 3
						) {
							sidebarScrollEl.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
						}
					}
				}, 20);
			}
		},
		[spans],
	);

	const [isAddSpanToFunnelModalOpen, setIsAddSpanToFunnelModalOpen] =
		useState(false);
	const [selectedSpanToAddToFunnel, setSelectedSpanToAddToFunnel] = useState<
		SpanV3 | undefined
	>(undefined);
	const handleAddSpanToFunnel = useCallback((span: SpanV3): void => {
		setIsAddSpanToFunnelModalOpen(true);
		setSelectedSpanToAddToFunnel(span);
	}, []);

	const urlQuery = useUrlQuery();
	const { safeNavigate } = useSafeNavigate();

	const handleSpanClick = useCallback(
		(span: SpanV3): void => {
			setSelectedSpan(span);
			if (span?.span_id) {
				urlQuery.set('spanId', span?.span_id);
			}

			safeNavigate({ search: urlQuery.toString() });
		},
		[setSelectedSpan, urlQuery, safeNavigate],
	);

	// Left side columns using TanStack React Table (extensible for future columns)
	const leftColumns = useMemo(
		() => [
			columnDefHelper.display({
				id: 'span-name',
				header: '',
				cell: (cellProps): JSX.Element => (
					<SpanOverview
						span={cellProps.row.original}
						handleCollapseUncollapse={handleCollapseUncollapse}
						isSpanCollapsed={
							isFullDataLoaded
								? !localUncollapsedNodes.has(cellProps.row.original.span_id)
								: !uncollapsedNodes.includes(cellProps.row.original.span_id)
						}
						selectedSpan={selectedSpan}
						handleSpanClick={handleSpanClick}
						filteredSpanIds={filteredSpanIds}
						isFilterActive={isFilterActive}
						onAddSpanToFunnel={handleAddSpanToFunnel}
						onHoverEnter={handleRowMouseEnter}
						onHoverLeave={handleRowMouseLeave}
					/>
				),
			}),
		],
		[
			handleCollapseUncollapse,
			uncollapsedNodes,
			isFullDataLoaded,
			localUncollapsedNodes,
			selectedSpan,
			handleSpanClick,
			filteredSpanIds,
			isFilterActive,
			handleAddSpanToFunnel,
			handleRowMouseEnter,
			handleRowMouseLeave,
		],
	);

	const leftTable = useReactTable({
		data: spans,
		columns: leftColumns,
		getCoreRowModel: getCoreRowModel(),
	});

	// Shared virtualizer - one instance drives both panels
	const virtualizer = useVirtualizer({
		count: spans.length,
		getScrollElement: (): HTMLDivElement | null => scrollContainerRef.current,
		estimateSize: (): number => ROW_HEIGHT,
		overscan: 20,
		onChange: handleVirtualizerInstanceChanged,
	});

	useEffect(() => {
		virtualizerRef.current = virtualizer;
	}, [virtualizer]);

	// Compute max content width for sidebar horizontal scroll
	const maxContentWidth = useMemo(() => {
		if (spans.length === 0) {
			return sidebarWidth;
		}
		const maxLevel = spans.reduce((max, span) => Math.max(max, span.level), 0);
		return Math.max(
			sidebarWidth,
			maxLevel * (CONNECTOR_WIDTH + VERTICAL_CONNECTOR_WIDTH) + BASE_CONTENT_WIDTH,
		);
	}, [spans, sidebarWidth]);

	// Scroll a span to viewport center if it isn't already visible. Shared by
	// the two effects below — one keyed on interestedSpanId (chevron, boundary
	// pagination, deep-link to unloaded), the other on selectedSpan (in-window
	// URL navigation that doesn't mutate interestedSpanId).
	const scrollSpanIntoView = useCallback(
		(span: SpanV3, spansList: SpanV3[]): void => {
			if (!virtualizerRef.current) {
				return;
			}
			const idx = spansList.findIndex((s) => s.span_id === span.span_id);
			if (idx === -1) {
				return;
			}
			const scrollEl = scrollContainerRef.current;
			const scrollTop = scrollEl?.scrollTop ?? 0;
			const viewportHeight = scrollEl?.clientHeight ?? 0;
			const viewportStartIdx = Math.floor(scrollTop / ROW_HEIGHT);
			const viewportEndIdx =
				Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) - 1;
			const isOnScreen =
				viewportHeight > 0 && idx >= viewportStartIdx && idx <= viewportEndIdx;
			if (isOnScreen) {
				return;
			}
			setTimeout(() => {
				virtualizerRef.current?.scrollToIndex(idx, {
					align: 'center',
					behavior: 'auto',
				});
				const sidebarScrollEl = scrollContainerRef.current?.querySelector(
					'.resizable-box__content',
				);
				if (sidebarScrollEl) {
					const targetScrollLeft = Math.max(0, span.level * CONNECTOR_WIDTH - 40);
					(sidebarScrollEl as HTMLElement).scrollLeft = targetScrollLeft;
				}
			}, 100);
		},
		[],
	);

	// Backend mode: scroll + select to the interestedSpanId target. `spans` in
	// deps so we retry once a refetch lands (chevron / pagination / deep-link).
	useEffect(() => {
		if (isFullDataLoaded || interestedSpanId.spanId === '') {
			return;
		}
		const idx = spans.findIndex(
			(span) => span.span_id === interestedSpanId.spanId,
		);
		if (idx !== -1) {
			scrollSpanIntoView(spans[idx], spans);
			setSelectedSpan(spans[idx]);
		}
	}, [
		interestedSpanId,
		setSelectedSpan,
		spans,
		scrollSpanIntoView,
		isFullDataLoaded,
	]);

	// Covers URL-driven navigation to an already-loaded span (flamegraph /
	// filter / browser back) that the interestedSpanId-keyed effect doesn't see.
	useEffect(() => {
		if (selectedSpan) {
			scrollSpanIntoView(selectedSpan, spans);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedSpan, scrollSpanIntoView]);

	const virtualItems = virtualizer.getVirtualItems();
	const leftRows = leftTable.getRowModel().rows;

	const handleHoverCardOpenChange = useCallback((open: boolean): void => {
		if (!open) {
			setHoveredSpanId(null);
		}
	}, []);

	return (
		<div className={styles.root}>
			{isFetching && <div className={styles.loadingBar} />}
			<div className={styles.splitPanel} ref={scrollContainerRef}>
				{/* Sticky header row */}
				<div className={styles.splitHeader}>
					<div
						className={styles.sidebarHeader}
						style={{ width: sidebarWidth, flexShrink: 0 }}
					/>
					<div className={styles.resizeHandleHeader} />
					<div className={styles.statusHeader} />
					<div className={styles.timelineHeader}>
						<TimelineV3
							startTimestamp={traceMetadata.startTime}
							endTimestamp={traceMetadata.endTime}
							timelineHeight={10}
							offsetTimestamp={0}
							cursorXPercent={cursorXPercent}
						/>
					</div>
				</div>

				{/* Split body */}
				<div
					className={styles.splitBody}
					style={{
						minHeight: virtualizer.getTotalSize() + WATERFALL_BOTTOM_PADDING,
						height: '100%',
					}}
				>
					{/* Top / bottom sentinels: each transition into the viewport
					    fires a load-more via useBoundaryPagination. */}
					<div
						ref={loadMoreTopSentinelRef}
						className={cx(styles.loadMoreSentinel, styles.loadMoreSentinelTop)}
					/>
					<div
						ref={loadMoreBottomSentinelRef}
						className={cx(styles.loadMoreSentinel, styles.loadMoreSentinelBottom)}
					/>
					<SpanHoverCard
						hoveredSpanId={hoveredSpanId}
						onOpenChange={handleHoverCardOpenChange}
						anchorLeft={sidebarWidth}
						rowHeight={ROW_HEIGHT}
						spans={spans}
						traceStartTime={traceMetadata.startTime}
					/>
					{/* Left panel - table with horizontal scroll */}
					<ResizableBox
						handle="right"
						defaultWidth={DEFAULT_SIDEBAR_WIDTH}
						minWidth={MIN_SIDEBAR_WIDTH}
						maxWidth={MAX_SIDEBAR_WIDTH}
						onResize={setSidebarWidth}
						className={styles.sidebar}
					>
						<table className={styles.treeTable} style={{ width: maxContentWidth }}>
							<tbody>
								{virtualItems.map((virtualRow) => {
									const row = leftRows[virtualRow.index];
									const span = spans[virtualRow.index];
									return (
										<tr
											key={String(virtualRow.key)}
											data-testid={`cell-0-${span.span_id}`}
											data-span-id={span.span_id}
											className={styles.treeRow}
											style={{
												position: 'absolute',
												top: 0,
												left: 0,
												width: '100%',
												height: ROW_HEIGHT,
												transform: `translateY(${virtualRow.start}px)`,
											}}
											onMouseEnter={(): void => handleRowMouseEnter(span.span_id)}
											onMouseLeave={handleRowMouseLeave}
										>
											{row.getVisibleCells().map((cell) => (
												<td key={cell.id} className={styles.treeCell}>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</td>
											))}
										</tr>
									);
								})}
							</tbody>
						</table>
					</ResizableBox>

					{/* Status code column */}
					<div className={styles.statusCol}>
						{virtualItems.map((virtualRow) => {
							const span = spans[virtualRow.index];
							const { isSelected, isDimmed, isSelectedNonMatching, isMatching } =
								getSpanStateClasses(
									span.span_id,
									selectedSpan,
									filteredSpanIds,
									isFilterActive,
								);
							return (
								<div
									key={`status-${String(virtualRow.key)}`}
									className={cx(styles.statusCell, {
										[styles.isInterested]: isSelected && (!isFilterActive || isMatching),
										[styles.isDimmed]: isDimmed,
										[styles.isSelectedNonMatching]: isSelectedNonMatching,
									})}
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										width: '100%',
										height: ROW_HEIGHT,
										transform: `translateY(${virtualRow.start}px)`,
									}}
									data-span-id={span.span_id}
									onMouseEnter={(): void => applyHoverClass(span.span_id)}
									onMouseLeave={(): void => applyHoverClass(null)}
									onClick={(): void => handleSpanClick(span)}
								>
									{span.response_status_code && (
										<HttpStatusBadge statusCode={span.response_status_code} />
									)}
								</div>
							);
						})}
					</div>

					{/* Right panel - timeline bars */}
					<div
						className={styles.timeline}
						ref={timelineAreaRef}
						onMouseMove={onCrosshairMove}
						onMouseLeave={onCrosshairLeave}
					>
						{cursorX !== null && (
							<div className={styles.crosshair} style={{ left: cursorX }} />
						)}
						{virtualItems.map((virtualRow) => {
							const span = spans[virtualRow.index];
							return (
								<div
									key={String(virtualRow.key)}
									data-testid={`cell-1-${span.span_id}`}
									data-span-id={span.span_id}
									className={styles.timelineRow}
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										width: '100%',
										height: ROW_HEIGHT,
										transform: `translateY(${virtualRow.start}px)`,
									}}
									onMouseEnter={(): void => applyHoverClass(span.span_id)}
									onMouseLeave={(): void => applyHoverClass(null)}
								>
									<SpanDuration
										span={span}
										traceMetadata={traceMetadata}
										selectedSpan={selectedSpan}
										handleSpanClick={handleSpanClick}
										filteredSpanIds={filteredSpanIds}
										isFilterActive={isFilterActive}
									/>
								</div>
							);
						})}
					</div>
				</div>
			</div>
			{selectedSpanToAddToFunnel && (
				<AddSpanToFunnelModal
					span={selectedSpanToAddToFunnel}
					isOpen={isAddSpanToFunnelModalOpen}
					onClose={(): void => setIsAddSpanToFunnelModalOpen(false)}
				/>
			)}
		</div>
	);
}

export default Success;
