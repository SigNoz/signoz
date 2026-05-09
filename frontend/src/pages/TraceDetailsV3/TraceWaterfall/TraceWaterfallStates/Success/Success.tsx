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
import {
	Badge,
	Button,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@signozhq/ui';
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
import { themeColors } from 'constants/theme';
import { convertTimeToRelevantUnit } from 'container/TraceDetail/utils';
import { useCopySpanLink } from 'hooks/trace/useCopySpanLink';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { colorToRgb, generateColor } from 'lib/uPlotLib/utils/generateColor';
import {
	AlertCircle,
	ArrowUpRight,
	ChevronDown,
	ChevronRight,
	Link,
	ListPlus,
} from 'lucide-react';
import { useCrosshair } from 'pages/TraceDetailsV3/hooks/useCrosshair';
import { ResizableBox } from 'periscope/components/ResizableBox';
import { EventV3, SpanV3 } from 'types/api/trace/getTraceV3';
import { toFixed } from 'utils/toFixed';

import { EventTooltipContent } from '../../../SpanHoverCard/EventTooltipContent';
import SpanHoverCard from '../../../SpanHoverCard/SpanHoverCard';
import AddSpanToFunnelModal from '../../AddSpanToFunnelModal/AddSpanToFunnelModal';
import { IInterestedSpan } from '../../TraceWaterfall';

import './Success.styles.scss';

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
		timerRef.current = setTimeout(() => setShowPopover(true), 150);
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
			className={`event-dot ${isError ? 'error' : ''}`}
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
			<Tooltip
				open
				onOpenChange={(open): void => {
					if (!open) {
						setShowPopover(false);
					}
				}}
			>
				<TooltipTrigger asChild>{dot}</TooltipTrigger>
				<TooltipContent className="span-hover-card-popover">
					<EventTooltipContent
						eventName={event.name}
						timeOffsetMs={eventTimeMs - spanTimestamp}
						isError={isError}
						attributeMap={event.attributeMap || {}}
					/>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
});

// css config
const CONNECTOR_WIDTH = 20;
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
	traceMetadata,
	onAddSpanToFunnel,
}: {
	span: SpanV3;
	isSpanCollapsed: boolean;
	handleCollapseUncollapse: (id: string, collapse: boolean) => void;
	selectedSpan: SpanV3 | undefined;
	handleSpanClick: (span: SpanV3) => void;
	filteredSpanIds: string[];
	isFilterActive: boolean;
	traceMetadata: ITraceMetadata;
	onAddSpanToFunnel: (span: SpanV3) => void;
}): JSX.Element {
	const isRootSpan = span.level === 0;
	const { onSpanCopy } = useCopySpanLink(span);

	let color = generateColor(
		span['service.name'],
		themeColors.traceDetailColorsV3,
	);
	if (span.has_error) {
		color = `var(--bg-cherry-500)`;
	}

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

	const indentWidth = isRootSpan ? 0 : span.level * CONNECTOR_WIDTH;

	const handleFunnelClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
		e.stopPropagation();
		onAddSpanToFunnel(span);
	};

	return (
		<SpanHoverCard span={span} traceMetadata={traceMetadata}>
			<div
				className={cx('span-overview', {
					'interested-span': isSelected && (!isFilterActive || isMatching),
					'highlighted-span': isHighlighted,
					'selected-non-matching-span': isSelectedNonMatching,
					'dimmed-span': isDimmed,
				})}
				onClick={(): void => handleSpanClick(span)}
			>
				{/* Tree connector lines — always draw vertical lines at all ancestor levels + L-connector */}
				{!isRootSpan &&
					Array.from({ length: span.level }, (_, i) => {
						const lvl = i + 1;
						const xPos = (lvl - 1) * CONNECTOR_WIDTH + 9;
						if (lvl < span.level) {
							// Stop the line at 50% for the last child's parent level
							const isLastChildParentLine =
								!span.has_sibling && lvl === span.level - 1;
							return (
								<div
									key={lvl}
									className="tree-line"
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
									className="tree-line"
									style={{ left: xPos, top: 0, width: 1, height: '50%' }}
								/>
								<div className="tree-connector" style={{ left: xPos, top: 0 }} />
							</div>
						);
					})}

				{/* Indent spacer */}
				<span className="tree-indent" style={{ width: `${indentWidth}px` }} />

				{/* Expand/collapse arrow + child count (only for spans with children) */}
				{span.has_children && (
					<>
						<span
							className={cx('tree-arrow', { expanded: !isSpanCollapsed })}
							onClick={(event): void => {
								event.stopPropagation();
								event.preventDefault();
								handleCollapseUncollapse(span.span_id, !isSpanCollapsed);
							}}
						>
							{isSpanCollapsed ? (
								<ChevronRight size={14} />
							) : (
								<ChevronDown size={14} />
							)}
						</span>
						<span className="subtree-count">
							<Badge color="vanilla">{span.sub_tree_node_count}</Badge>
						</span>
					</>
				)}

				{/* Colored service dot */}
				<span
					className={cx('tree-icon', { 'is-error': span.has_error })}
					style={{ backgroundColor: color }}
				/>

				{/* Span name + service name */}
				<span className="tree-label">
					{span.name}
					<span className="tree-service-name">{span['service.name']}</span>
				</span>

				{/* Action buttons — shown on hover via CSS, right-aligned */}
				<span className="span-row-actions">
					<TooltipProvider delayDuration={200}>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									color="secondary"
									className="span-action-btn"
									onClick={onSpanCopy}
								>
									<Link size={12} />
								</Button>
							</TooltipTrigger>
							<TooltipContent className="span-action-tooltip">
								Copy Span Link
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									color="secondary"
									className="span-action-btn"
									onClick={handleFunnelClick}
								>
									<ListPlus size={12} />
								</Button>
							</TooltipTrigger>
							<TooltipContent className="span-action-tooltip">
								Add to Trace Funnel
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</span>
			</div>
		</SpanHoverCard>
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

	let color = generateColor(
		span['service.name'],
		themeColors.traceDetailColorsV3,
	);
	let rgbColor = colorToRgb(color);

	if (span.has_error) {
		color = `var(--bg-cherry-500)`;
		rgbColor = '239, 68, 68';
	}

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
			className={cx('span-duration', {
				'interested-span': isSelected && (!isFilterActive || isMatching),
				'highlighted-span': isHighlighted,
				'selected-non-matching-span': isSelectedNonMatching,
				'dimmed-span': isDimmed,
			})}
			onClick={(): void => handleSpanClick(span)}
		>
			<SpanHoverCard span={span} traceMetadata={traceMetadata}>
				<div
					className="span-bar"
					style={
						{
							left: `${leftOffset}%`,
							width: `${width}%`,
							'--span-color': color,
							'--span-color-rgb': rgbColor,
						} as React.CSSProperties
					}
				>
					<span className="span-info">
						<span className="span-name">{span.name}</span>
						<span className="span-duration-text">{`${toFixed(
							time,
							2,
						)} ${timeUnitName}`}</span>
					</span>
				</div>
			</SpanHoverCard>
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
		cursorXPercent,
		cursorX,
		onMouseMove: onCrosshairMove,
		onMouseLeave: onCrosshairLeave,
	} = useCrosshair({ containerRef: timelineAreaRef, enabled: false });

	// Imperative DOM class toggling for hover highlights (avoids React re-renders)
	const applyHoverClass = useCallback((spanId: string | null): void => {
		const prev = prevHoveredSpanIdRef.current;
		if (prev === spanId) {
			return;
		}

		if (prev) {
			const prevElements = document.querySelectorAll(`[data-span-id="${prev}"]`);
			prevElements.forEach((el) => el.classList.remove('hovered-span'));
		}
		if (spanId) {
			const nextElements = document.querySelectorAll(`[data-span-id="${spanId}"]`);
			nextElements.forEach((el) => el.classList.add('hovered-span'));
		}
		prevHoveredSpanIdRef.current = spanId;
	}, []);

	const handleRowMouseEnter = useCallback(
		(spanId: string): void => {
			applyHoverClass(spanId);
		},
		[applyHoverClass],
	);

	const handleRowMouseLeave = useCallback((): void => {
		applyHoverClass(null);
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
			} else {
				// Backend mode: trigger API call (current behavior)
				setInterestedSpanId({
					spanId,
					isUncollapsed: !collapse,
					scrollToSpan: false,
				});
			}
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

			// In frontend mode all data is already loaded, no need to fetch more.
			// In backend mode, skip auto-fetch when under 500 spans (nothing more to paginate).
			if (isFullDataLoaded || spans.length < 500) {
				return;
			}

			if (range?.startIndex === 0 && instance.isScrolling) {
				// do not trigger for trace root as nothing to fetch above
				if (spans[0].level !== 0) {
					setInterestedSpanId({
						spanId: spans[0].span_id,
						isUncollapsed: false,
					});
				}
				return;
			}

			if (range?.endIndex === spans.length - 1 && instance.isScrolling) {
				setInterestedSpanId({
					spanId: spans[spans.length - 1].span_id,
					isUncollapsed: false,
				});
			}
		},
		[spans, setInterestedSpanId],
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
						traceMetadata={traceMetadata}
						filteredSpanIds={filteredSpanIds}
						isFilterActive={isFilterActive}
						onAddSpanToFunnel={handleAddSpanToFunnel}
					/>
				),
			}),
		],
		[
			handleCollapseUncollapse,
			uncollapsedNodes,
			isFullDataLoaded,
			localUncollapsedNodes,
			traceMetadata,
			selectedSpan,
			handleSpanClick,
			filteredSpanIds,
			isFilterActive,
			handleAddSpanToFunnel,
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

	// Scroll to interested span — only when scrollToSpan is true (URL nav, flamegraph click, initial load)
	// Skip for collapse/uncollapse to avoid jarring scroll jumps
	useEffect(() => {
		if (interestedSpanId.spanId !== '' && virtualizerRef.current) {
			const idx = spans.findIndex(
				(span) => span.span_id === interestedSpanId.spanId,
			);
			if (idx !== -1) {
				if (interestedSpanId.scrollToSpan !== false) {
					setTimeout(() => {
						virtualizerRef.current?.scrollToIndex(idx, {
							align: 'center',
							behavior: 'auto',
						});

						// Auto-scroll sidebar horizontally to show the span name
						const span = spans[idx];
						const sidebarScrollEl = scrollContainerRef.current?.querySelector(
							'.resizable-box__content',
						);
						if (sidebarScrollEl) {
							const targetScrollLeft = Math.max(0, span.level * CONNECTOR_WIDTH - 40);
							sidebarScrollEl.scrollLeft = targetScrollLeft;
						}
					}, 400);
				}

				setSelectedSpan(spans[idx]);
			}
		} else {
			setSelectedSpan((prev) => {
				if (!prev) {
					return spans[0];
				}
				return prev;
			});
		}
	}, [interestedSpanId, setSelectedSpan, spans]);

	const virtualItems = virtualizer.getVirtualItems();
	const leftRows = leftTable.getRowModel().rows;

	return (
		<div className="success-content">
			{traceMetadata.hasMissingSpans && (
				<div className="missing-spans">
					<section className="left-info">
						<AlertCircle size={14} />
						<span className="text">This trace has missing spans</span>
					</section>
					<Button
						variant="ghost"
						color="secondary"
						className="right-info"
						suffix={<ArrowUpRight size={14} />}
						onClick={(): WindowProxy | null =>
							window.open(
								'https://signoz.io/docs/userguide/traces/#missing-spans',
								'_blank',
							)
						}
					>
						Learn More
					</Button>
				</div>
			)}
			{isFetching && <div className="waterfall-loading-bar" />}
			<div className="waterfall-split-panel" ref={scrollContainerRef}>
				{/* Sticky header row */}
				<div className="waterfall-split-header">
					<div
						className="sidebar-header"
						style={{ width: sidebarWidth, flexShrink: 0 }}
					/>
					<div className="resize-handle-header" />
					<div className="status-header" />
					<div className="timeline-header">
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
					className="waterfall-split-body"
					style={{
						minHeight: virtualizer.getTotalSize(),
						height: '100%',
					}}
				>
					{/* Left panel - table with horizontal scroll */}
					<ResizableBox
						direction="horizontal"
						defaultWidth={DEFAULT_SIDEBAR_WIDTH}
						minWidth={MIN_SIDEBAR_WIDTH}
						maxWidth={MAX_SIDEBAR_WIDTH}
						onResize={setSidebarWidth}
						className="waterfall-sidebar"
					>
						<table className="span-tree-table" style={{ width: maxContentWidth }}>
							<tbody>
								{virtualItems.map((virtualRow) => {
									const row = leftRows[virtualRow.index];
									const span = spans[virtualRow.index];
									return (
										<tr
											key={String(virtualRow.key)}
											data-testid={`cell-0-${span.span_id}`}
											data-span-id={span.span_id}
											className="span-tree-row"
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
												<td key={cell.id} className="span-tree-cell">
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
					<div className="waterfall-status-col">
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
									className={cx('status-cell', {
										'interested-span': isSelected && (!isFilterActive || isMatching),
										'dimmed-span': isDimmed,
										'selected-non-matching-span': isSelectedNonMatching,
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
									onMouseEnter={(): void => handleRowMouseEnter(span.span_id)}
									onMouseLeave={handleRowMouseLeave}
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
						className="waterfall-timeline"
						ref={timelineAreaRef}
						onMouseMove={onCrosshairMove}
						onMouseLeave={onCrosshairLeave}
					>
						{cursorX !== null && (
							<div className="waterfall-crosshair" style={{ left: cursorX }} />
						)}
						{virtualItems.map((virtualRow) => {
							const span = spans[virtualRow.index];
							return (
								<div
									key={String(virtualRow.key)}
									data-testid={`cell-1-${span.span_id}`}
									data-span-id={span.span_id}
									className="timeline-row"
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
