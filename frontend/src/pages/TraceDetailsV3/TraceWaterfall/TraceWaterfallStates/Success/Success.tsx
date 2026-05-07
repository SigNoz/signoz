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
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer, Virtualizer } from '@tanstack/react-virtual';
import { Button, Popover, Tooltip, Typography } from 'antd';
import cx from 'classnames';
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
import { ResizableBox } from 'periscope/components/ResizableBox';
import { Span } from 'types/api/trace/getTraceV2';
import { toFixed } from 'utils/toFixed';

import { EventTooltipContent } from '../../../SpanHoverCard/EventTooltipContent';
import SpanHoverCard from '../../../SpanHoverCard/SpanHoverCard';
import AddSpanToFunnelModal from '../../AddSpanToFunnelModal/AddSpanToFunnelModal';
import { IInterestedSpan } from '../../TraceWaterfall';
import Filters from './Filters/Filters';

import './Success.styles.scss';

// css config
const CONNECTOR_WIDTH = 20;
const VERTICAL_CONNECTOR_WIDTH = 1;

interface ITraceMetadata {
	traceId: string;
	startTime: number;
	endTime: number;
	hasMissingSpans: boolean;
}
interface ISuccessProps {
	spans: Span[];
	traceMetadata: ITraceMetadata;
	interestedSpanId: IInterestedSpan;
	uncollapsedNodes: string[];
	setInterestedSpanId: Dispatch<SetStateAction<IInterestedSpan>>;
	selectedSpan: Span | undefined;
	setSelectedSpan: Dispatch<SetStateAction<Span | undefined>>;
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
	span: Span;
	isSpanCollapsed: boolean;
	handleCollapseUncollapse: (id: string, collapse: boolean) => void;
	selectedSpan: Span | undefined;
	handleSpanClick: (span: Span) => void;
	filteredSpanIds: string[];
	isFilterActive: boolean;
	traceMetadata: ITraceMetadata;
	onAddSpanToFunnel: (span: Span) => void;
}): JSX.Element {
	const isRootSpan = span.level === 0;
	const { onSpanCopy } = useCopySpanLink(span);

	let color = generateColor(span.serviceName, themeColors.traceDetailColorsV3);
	if (span.hasError) {
		color = `var(--bg-cherry-500)`;
	}

	// Smart highlighting logic
	const isMatching =
		isFilterActive && (filteredSpanIds || []).includes(span.spanId);
	const isSelected = selectedSpan?.spanId === span.spanId;
	const isDimmed = isFilterActive && !isMatching && !isSelected;
	const isHighlighted = isFilterActive && isMatching && !isSelected;
	const isSelectedNonMatching = isSelected && isFilterActive && !isMatching;

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
							const isLastChildParentLine = !span.hasSibling && lvl === span.level - 1;
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

				{/* Expand/collapse arrow or leaf bullet */}
				{span.hasChildren ? (
					<span
						className={cx('tree-arrow', { expanded: !isSpanCollapsed })}
						onClick={(event): void => {
							event.stopPropagation();
							event.preventDefault();
							handleCollapseUncollapse(span.spanId, !isSpanCollapsed);
						}}
					>
						{isSpanCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
					</span>
				) : (
					<span className="tree-arrow no-children" />
				)}

				{/* Colored service dot */}
				<span
					className={cx('tree-icon', { 'is-error': span.hasError })}
					style={{ backgroundColor: color }}
				/>

				{/* Span name */}
				<span className="tree-label">{span.name}</span>

				{/* Action buttons — shown on hover via CSS, right-aligned */}
				<span className="span-row-actions">
					<Tooltip title="Copy Span Link">
						<button type="button" className="span-action-btn" onClick={onSpanCopy}>
							<Link size={12} />
						</button>
					</Tooltip>
					<Tooltip title="Add to Trace Funnel">
						<button
							type="button"
							className="span-action-btn"
							onClick={handleFunnelClick}
						>
							<ListPlus size={12} />
						</button>
					</Tooltip>
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
	span: Span;
	traceMetadata: ITraceMetadata;
	selectedSpan: Span | undefined;
	handleSpanClick: (span: Span) => void;
	filteredSpanIds: string[];
	isFilterActive: boolean;
}): JSX.Element {
	const { time, timeUnitName } = convertTimeToRelevantUnit(
		span.durationNano / 1e6,
	);

	const spread = traceMetadata.endTime - traceMetadata.startTime;
	const leftOffset = ((span.timestamp - traceMetadata.startTime) * 1e2) / spread;
	const width = (span.durationNano * 1e2) / (spread * 1e6);

	let color = generateColor(span.serviceName, themeColors.traceDetailColorsV3);
	let rgbColor = colorToRgb(color);

	if (span.hasError) {
		color = `var(--bg-cherry-500)`;
		rgbColor = '239, 68, 68';
	}

	const isMatching =
		isFilterActive && (filteredSpanIds || []).includes(span.spanId);
	const isSelected = selectedSpan?.spanId === span.spanId;
	const isDimmed = isFilterActive && !isMatching && !isSelected;
	const isHighlighted = isFilterActive && isMatching && !isSelected;
	const isSelectedNonMatching = isSelected && isFilterActive && !isMatching;

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
			{span.event?.map((event) => {
				const eventTimeMs = event.timeUnixNano / 1e6;
				const spanDurationMs = span.durationNano / 1e6;
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
					<Popover
						key={`${span.spanId}-event-${event.name}-${event.timeUnixNano}`}
						content={
							<EventTooltipContent
								eventName={event.name}
								timeOffsetMs={eventTimeMs - span.timestamp}
								isError={isError}
								attributeMap={event.attributeMap || {}}
							/>
						}
						trigger="hover"
						rootClassName="span-hover-card-popover"
						autoAdjustOverflow
						arrow={false}
					>
						<div
							className={`event-dot ${isError ? 'error' : ''}`}
							style={
								{
									left: `${dotLeft}%`,
									'--event-dot-bg': isError ? undefined : dotBg,
									'--event-dot-border': isError ? undefined : dotBorder,
								} as React.CSSProperties
							}
						/>
					</Popover>
				);
			})}
		</div>
	);
});

// table config
const columnDefHelper = createColumnHelper<Span>();

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
		setInterestedSpanId,
		setSelectedSpan,
		selectedSpan,
		isFetching,
	} = props;

	const [filteredSpanIds, setFilteredSpanIds] = useState<string[]>([]);
	const [isFilterActive, setIsFilterActive] = useState<boolean>(false);
	const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element>>();
	const prevHoveredSpanIdRef = useRef<string | null>(null);

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

	const handleFilteredSpansChange = useCallback(
		(spanIds: string[], isActive: boolean) => {
			setFilteredSpanIds(spanIds);
			setIsFilterActive(isActive);
		},
		[],
	);

	const handleCollapseUncollapse = useCallback(
		(spanId: string, collapse: boolean) => {
			setInterestedSpanId({ spanId, isUncollapsed: !collapse });
		},
		[setInterestedSpanId],
	);

	const handleVirtualizerInstanceChanged = useCallback(
		(instance: Virtualizer<HTMLDivElement, Element>): void => {
			const { range } = instance;
			// when there are less than 500 elements in the API call that means there is nothing to fetch on top and bottom so
			// do not trigger the API call
			if (spans.length < 500) {
				return;
			}

			if (range?.startIndex === 0 && instance.isScrolling) {
				// do not trigger for trace root as nothing to fetch above
				if (spans[0].level !== 0) {
					setInterestedSpanId({
						spanId: spans[0].spanId,
						isUncollapsed: false,
					});
				}
				return;
			}

			if (range?.endIndex === spans.length - 1 && instance.isScrolling) {
				setInterestedSpanId({
					spanId: spans[spans.length - 1].spanId,
					isUncollapsed: false,
				});
			}
		},
		[spans, setInterestedSpanId],
	);

	const [isAddSpanToFunnelModalOpen, setIsAddSpanToFunnelModalOpen] = useState(
		false,
	);
	const [selectedSpanToAddToFunnel, setSelectedSpanToAddToFunnel] = useState<
		Span | undefined
	>(undefined);
	const handleAddSpanToFunnel = useCallback((span: Span): void => {
		setIsAddSpanToFunnelModalOpen(true);
		setSelectedSpanToAddToFunnel(span);
	}, []);

	const urlQuery = useUrlQuery();
	const { safeNavigate } = useSafeNavigate();

	const handleSpanClick = useCallback(
		(span: Span): void => {
			setSelectedSpan(span);
			if (span?.spanId) {
				urlQuery.set('spanId', span?.spanId);
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
							!uncollapsedNodes.includes(cellProps.row.original.spanId)
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

	// Scroll to interested span
	useEffect(() => {
		if (interestedSpanId.spanId !== '' && virtualizerRef.current) {
			const idx = spans.findIndex(
				(span) => span.spanId === interestedSpanId.spanId,
			);
			if (idx !== -1) {
				setTimeout(() => {
					virtualizerRef.current?.scrollToIndex(idx, {
						align: 'center',
						behavior: 'auto',
					});
				}, 400);

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
						<Typography.Text className="text">
							This trace has missing spans
						</Typography.Text>
					</section>
					<Button
						icon={<ArrowUpRight size={14} />}
						className="right-info"
						type="text"
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
			<Filters
				startTime={traceMetadata.startTime / 1e3}
				endTime={traceMetadata.endTime / 1e3}
				traceID={traceMetadata.traceId}
				onFilteredSpansChange={handleFilteredSpansChange}
			/>
			{isFetching && <div className="waterfall-loading-bar" />}
			<div className="waterfall-split-panel" ref={scrollContainerRef}>
				{/* Sticky header row */}
				<div className="waterfall-split-header">
					<div
						className="sidebar-header"
						style={{ width: sidebarWidth, flexShrink: 0 }}
					/>
					<div className="resize-handle-header" />
					<div className="timeline-header">
						<TimelineV3
							startTimestamp={traceMetadata.startTime}
							endTimestamp={traceMetadata.endTime}
							timelineHeight={10}
							offsetTimestamp={0}
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
											data-testid={`cell-0-${span.spanId}`}
											data-span-id={span.spanId}
											className="span-tree-row"
											style={{
												position: 'absolute',
												top: 0,
												left: 0,
												width: '100%',
												height: ROW_HEIGHT,
												transform: `translateY(${virtualRow.start}px)`,
											}}
											onMouseEnter={(): void => handleRowMouseEnter(span.spanId)}
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

					{/* Right panel - timeline bars */}
					<div className="waterfall-timeline">
						{virtualItems.map((virtualRow) => {
							const span = spans[virtualRow.index];
							return (
								<div
									key={String(virtualRow.key)}
									data-testid={`cell-1-${span.spanId}`}
									data-span-id={span.spanId}
									className="timeline-row"
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										width: '100%',
										height: ROW_HEIGHT,
										transform: `translateY(${virtualRow.start}px)`,
									}}
									onMouseEnter={(): void => handleRowMouseEnter(span.spanId)}
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
