/* eslint-disable sonarjs/cognitive-complexity */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
	ChartNoAxesGantt,
	ChevronDown,
	ChevronRight,
	Info,
	TriangleAlert,
} from '@signozhq/icons';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { Collapse } from 'antd';
import { useDetailsPanel } from 'components/DetailsPanel';
import WarningPopover from 'components/WarningPopover/WarningPopover';
import { LOCALSTORAGE } from 'constants/localStorage';
import useGetTraceV4 from 'hooks/trace/useGetTraceV4';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { ResizableBox } from 'periscope/components/ResizableBox';
import { SpanV3, TraceDetailV3URLProps } from 'types/api/trace/getTraceV3';

import { TraceDetailEventKeys, TraceDetailEvents } from './events';
import { useTraceDetailLogEvent } from './hooks/useTraceDetailLogEvent';
import NoData from './NoData/NoData';
import TraceStoreSync from './stores/TraceStoreSync';
import { useTraceStore } from './stores/traceStore';
import { SpanDetailVariant } from './SpanDetailsPanel/constants';
import SpanDetailsPanel from './SpanDetailsPanel/SpanDetailsPanel';
import type { TraceMetadataForHeader } from './TraceDetailsHeader/TraceDetailsHeader';
import TraceDetailsHeader from './TraceDetailsHeader/TraceDetailsHeader';
import { FLAMEGRAPH_SPAN_LIMIT } from './TraceFlamegraph/constants';
import TraceFlamegraph from './TraceFlamegraph/TraceFlamegraph';
import TraceWaterfall from './TraceWaterfall/TraceWaterfall';
import { IInterestedSpan } from './TraceWaterfall/types';
import { getAncestorSpanIds } from './TraceWaterfall/utils';
import { getAvailableColorByFieldNames } from './utils';

import cx from 'classnames';

import styles from './TraceDetailsV3.module.scss';

// Lucide chevrons for the flame/waterfall accordion headers, matching the
// span-tree chevrons in the waterfall.
function renderPanelExpandIcon({
	isActive,
}: {
	isActive?: boolean;
}): JSX.Element {
	return isActive ? <ChevronDown size={14} /> : <ChevronRight size={14} />;
}

function TraceDetailsV3(): JSX.Element {
	const { id: traceId } = useParams<TraceDetailV3URLProps>();
	const urlQuery = useUrlQuery();
	const [interestedSpanId, setInterestedSpanId] = useState<IInterestedSpan>(
		() => ({
			spanId: urlQuery.get('spanId') || '',
			isUncollapsed: urlQuery.get('spanId') !== '',
		}),
	);
	const [uncollapsedNodes, setUncollapsedNodes] = useState<string[]>([]);
	const [localUncollapsedNodes, setLocalUncollapsedNodes] = useState<
		Set<string>
	>(new Set());
	const [selectedSpan, setSelectedSpan] = useState<SpanV3>();
	const [filteredSpanIds, setFilteredSpanIds] = useState<string[]>([]);
	const [isFilterActive, setIsFilterActive] = useState(false);

	const selectedSpanId = urlQuery.get('spanId') || undefined;
	const { safeNavigate } = useSafeNavigate();

	const logTraceEvent = useTraceDetailLogEvent('v3', traceId || '');
	// Tracks which traceId the load event already fired for, so navigating
	// between traces (the route component stays mounted) re-fires it once each.
	const dataLoadedFiredForRef = useRef('');
	const colorByField = useTraceStore((s) => s.colorByField);
	const previewFieldsCount = useTraceStore((s) => s.previewFields.length);
	const userPrefsReady = useTraceStore((s) => s.userPreferences !== null);

	const handleSpanDetailsClose = useCallback((): void => {
		urlQuery.delete('spanId');
		safeNavigate({ search: urlQuery.toString() });
	}, [urlQuery, safeNavigate]);

	const handleFilteredSpansChange = useCallback(
		(spanIds: string[], isActive: boolean): void => {
			setFilteredSpanIds(spanIds);
			setIsFilterActive(isActive);
		},
		[],
	);

	const panelState = useDetailsPanel({
		entityId: selectedSpanId,
		onClose: handleSpanDetailsClose,
	});

	const allSpansRef = useRef<SpanV3[]>([]);
	const deepLinkResolvedRef = useRef(false);

	// Refetch only when the URL target isn't already loaded. Keeps row clicks
	// and other in-window URL navigation from triggering a backend window slide.
	useEffect(() => {
		const spanId = urlQuery.get('spanId') || '';
		if (!spanId) {
			return;
		}
		const idx = allSpansRef.current.findIndex((s) => s.span_id === spanId);
		if (idx !== -1) {
			setSelectedSpan(allSpansRef.current[idx]);
			return;
		}
		setInterestedSpanId({ spanId, isUncollapsed: true });
	}, [urlQuery]);

	// Once all spans are loaded (frontend mode), freeze query params so
	// subsequent interestedSpanId changes don't trigger unnecessary refetches.
	const fullDataLoadedRef = useRef(false);
	const frozenParamsRef = useRef({
		selectedSpanId: interestedSpanId.spanId,
		isSelectedSpanIDUnCollapsed: interestedSpanId.isUncollapsed,
		uncollapsedSpans: uncollapsedNodes,
	});

	const queryParams = fullDataLoadedRef.current
		? frozenParamsRef.current
		: {
				selectedSpanId: interestedSpanId.spanId,
				isSelectedSpanIDUnCollapsed: interestedSpanId.isUncollapsed,
				uncollapsedSpans: uncollapsedNodes,
			};

	const {
		data: traceData,
		isFetching: isFetchingTraceData,
		error: errorFetchingTraceData,
	} = useGetTraceV4({
		traceId,
		uncollapsedSpans: queryParams.uncollapsedSpans,
		selectedSpanId: queryParams.selectedSpanId,
		isSelectedSpanIDUnCollapsed: queryParams.isSelectedSpanIDUnCollapsed,
	});

	const allSpans = traceData?.payload?.spans || [];
	const totalSpansCount = traceData?.payload?.totalSpansCount || 0;
	const isFullDataLoaded =
		totalSpansCount > 0 && totalSpansCount <= allSpans.length;

	// Color-by options, gated on fields in loaded spans. Resource attrs are
	// trace-wide, so any window has the full set — no need to accumulate.
	const availableColorByFields = useMemo(() => {
		const spans = traceData?.payload?.spans;
		return spans?.length ? getAvailableColorByFieldNames(spans) : undefined;
	}, [traceData?.payload?.spans]);

	// Lock the ref once we confirm all data is loaded
	if (isFullDataLoaded && !fullDataLoadedRef.current) {
		fullDataLoadedRef.current = true;
		frozenParamsRef.current = {
			selectedSpanId: interestedSpanId.spanId,
			isSelectedSpanIDUnCollapsed: interestedSpanId.isUncollapsed,
			uncollapsedSpans: uncollapsedNodes,
		};
	}

	useEffect(() => {
		allSpansRef.current = allSpans;
	}, [allSpans]);

	useEffect(() => {
		if (
			!traceId ||
			dataLoadedFiredForRef.current === traceId ||
			!userPrefsReady
		) {
			return;
		}
		const payload = traceData?.payload;
		if (!payload?.spans?.length) {
			return;
		}
		dataLoadedFiredForRef.current = traceId;
		const numServices = new Set(payload.spans.map((s) => s['service.name'])).size;
		logTraceEvent(TraceDetailEvents.DataLoaded, {
			[TraceDetailEventKeys.TotalSpansCount]: totalSpansCount,
			[TraceDetailEventKeys.NumServices]: numServices,
			[TraceDetailEventKeys.TraceDurationMs]:
				payload.endTimestampMillis - payload.startTimestampMillis,
			[TraceDetailEventKeys.HadErrors]: (payload.totalErrorSpansCount || 0) > 0,
			[TraceDetailEventKeys.FlamegraphSampled]:
				totalSpansCount > FLAMEGRAPH_SPAN_LIMIT,
			[TraceDetailEventKeys.SpanPanelVariant]:
				getLocalStorageKey(LOCALSTORAGE.TRACE_DETAILS_SPAN_DETAILS_POSITION) ||
				SpanDetailVariant.DOCKED_RIGHT,
			[TraceDetailEventKeys.ColorByField]: colorByField.name,
			[TraceDetailEventKeys.PreviewFieldsCount]: previewFieldsCount,
		});
	}, [
		traceId,
		userPrefsReady,
		traceData,
		totalSpansCount,
		colorByField,
		previewFieldsCount,
		logTraceEvent,
	]);

	// Frontend mode: expand all parents by default when full data arrives
	useEffect(() => {
		if (isFullDataLoaded && allSpans.length > 0) {
			const parentIds = new Set(
				allSpans.filter((s) => s.has_children).map((s) => s.span_id),
			);
			setLocalUncollapsedNodes(parentIds);
		}
	}, [isFullDataLoaded, allSpans]);

	// Backend mode: sync uncollapsed state from API response
	useEffect(() => {
		if (
			!isFullDataLoaded &&
			traceData &&
			traceData.payload &&
			traceData.payload.uncollapsedSpans
		) {
			setUncollapsedNodes(traceData.payload.uncollapsedSpans);
		}
	}, [traceData, isFullDataLoaded]);

	// Tracks whether we've already done the initial URL→selectedSpan handoff
	//Lets `interestedSpanId` stay purely as the refetch trigger in frontend mode.
	useEffect(() => {
		if (deepLinkResolvedRef.current) {
			return;
		}
		if (allSpans.length === 0) {
			return;
		}
		if (selectedSpanId) {
			const span = allSpans.find((s) => s.span_id === selectedSpanId);
			if (!span) {
				// Span not in the current window — wait for more data (backend
				// pagination) before marking resolved.
				return;
			}
			setSelectedSpan(span);
		} else {
			setSelectedSpan((prev) => prev ?? allSpans[0]);
		}
		deepLinkResolvedRef.current = true;
	}, [selectedSpanId, allSpans]);

	// Frontend mode: auto-expand ancestors of the URL-targeted span so it's
	// visible. Keyed on URL `spanId`(selectedSpanId).
	useEffect(() => {
		if (!isFullDataLoaded || !selectedSpanId || allSpans.length === 0) {
			return;
		}
		const ancestors = getAncestorSpanIds(allSpans, selectedSpanId);
		if (ancestors.size === 0) {
			return;
		}
		setLocalUncollapsedNodes((prev) => {
			// Check if all ancestors are already expanded — avoid unnecessary state update
			let allPresent = true;
			for (const id of ancestors) {
				if (!prev.has(id)) {
					allPresent = false;
					break;
				}
			}
			if (allPresent) {
				return prev;
			}

			const next = new Set(prev);
			for (const id of ancestors) {
				next.add(id);
			}
			return next;
		});
	}, [isFullDataLoaded, selectedSpanId, allSpans]);

	const [activeKeys, setActiveKeys] = useState<string[]>(['flame', 'waterfall']);

	const handleCollapseChange = (key: string): void => {
		logTraceEvent(
			key === 'flame'
				? TraceDetailEvents.FlameGraphToggled
				: TraceDetailEvents.WaterfallToggled,
			{ [TraceDetailEventKeys.Expanded]: !activeKeys.includes(key) },
		);
		setActiveKeys((prev) =>
			prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
		);
	};

	const [spanDetailVariant, setSpanDetailVariant] = useState<SpanDetailVariant>(
		() =>
			(getLocalStorageKey(
				LOCALSTORAGE.TRACE_DETAILS_SPAN_DETAILS_POSITION,
			) as SpanDetailVariant) || SpanDetailVariant.DOCKED_RIGHT,
	);

	const RIGHT_DOCK_MIN = 480;
	const RIGHT_DOCK_MAX = 720;
	const [rightDockWidth, setRightDockWidth] = useState(RIGHT_DOCK_MIN);

	const handleVariantChange = useCallback(
		(newVariant: SpanDetailVariant): void => {
			setLocalStorageKey(
				LOCALSTORAGE.TRACE_DETAILS_SPAN_DETAILS_POSITION,
				newVariant,
			);
			setSpanDetailVariant(newVariant);
		},
		[],
	);

	const filterMetadata = useMemo(
		() => ({
			startTime: (traceData?.payload?.startTimestampMillis || 0) / 1e3,
			endTime: (traceData?.payload?.endTimestampMillis || 0) / 1e3,
			traceId: traceId || '',
		}),
		[
			traceData?.payload?.startTimestampMillis,
			traceData?.payload?.endTimestampMillis,
			traceId,
		],
	);

	const traceMetadataForHeader = useMemo(():
		| TraceMetadataForHeader
		| undefined => {
		const payload = traceData?.payload;
		if (!payload) {
			return undefined;
		}
		const rootSpan = payload.spans?.find((s) => s.level === 0);
		return {
			startTimestampMillis: payload.startTimestampMillis,
			endTimestampMillis: payload.endTimestampMillis,
			rootServiceName: payload.rootServiceName,
			rootServiceEntryPoint: payload.rootServiceEntryPoint,
			rootSpanStatusCode: rootSpan?.response_status_code || '',
			hasMissingSpans: payload.hasMissingSpans || false,
		};
	}, [traceData?.payload]);

	const showNoData =
		!isFetchingTraceData &&
		(!!errorFetchingTraceData || !traceData?.payload?.spans?.length);

	const isDocked = spanDetailVariant === SpanDetailVariant.DOCKED;
	const isRightDocked = spanDetailVariant === SpanDetailVariant.DOCKED_RIGHT;
	const isWaterfallDocked = panelState.isOpen && isDocked;
	const showRightDock = panelState.isOpen && isRightDocked;

	const waterfallChildren = (
		<ResizableBox
			defaultHeight={300}
			minHeight={150}
			disabled={!isWaterfallDocked}
		>
			<TraceWaterfall
				traceData={traceData}
				isFetchingTraceData={isFetchingTraceData}
				errorFetchingTraceData={errorFetchingTraceData}
				traceId={traceId || ''}
				interestedSpanId={interestedSpanId}
				setInterestedSpanId={setInterestedSpanId}
				uncollapsedNodes={uncollapsedNodes}
				isFullDataLoaded={isFullDataLoaded}
				localUncollapsedNodes={localUncollapsedNodes}
				setLocalUncollapsedNodes={setLocalUncollapsedNodes}
				selectedSpan={selectedSpan}
				setSelectedSpan={setSelectedSpan}
				filteredSpanIds={filteredSpanIds}
				isFilterActive={isFilterActive}
			/>
		</ResizableBox>
	);

	return (
		<TraceStoreSync availableColorByFields={availableColorByFields}>
			<div className={styles.root}>
				<TraceDetailsHeader
					filterMetadata={filterMetadata}
					onFilteredSpansChange={handleFilteredSpansChange}
					isDataLoaded={!!traceData?.payload?.spans?.length && !showNoData}
					traceMetadata={traceMetadataForHeader}
				/>

				{showNoData ? (
					<NoData />
				) : (
					<>
						<div className={styles.layoutRow}>
							<div className={styles.content}>
								<Collapse
									// @ts-expect-error motion is passed through to rc-collapse to disable animation
									motion={false}
									activeKey={activeKeys.filter((k) => k === 'flame')}
									onChange={(): void => handleCollapseChange('flame')}
									size="small"
									expandIcon={renderPanelExpandIcon}
									className={styles.flameCollapse}
									items={[
										{
											key: 'flame',
											label: (
												<div className={styles.collapseLabel}>
													<span className={styles.collapseTitle}>
														Flame Graph
														{traceData?.payload?.totalSpansCount &&
															traceData.payload.totalSpansCount > FLAMEGRAPH_SPAN_LIMIT && (
																<WarningPopover
																	message="The total span count exceeds the visualization limit. Displaying a sampled subset of spans in flamegraph."
																	placement="bottomLeft"
																>
																	<Info
																		size={16}
																		color="var(--l2-foreground)"
																		style={{ cursor: 'pointer' }}
																	/>
																</WarningPopover>
															)}
													</span>
													{traceData?.payload?.totalSpansCount ? (
														<span className={styles.collapseCount}>
															<span className={styles.collapseCountItem}>
																<ChartNoAxesGantt size={13} />
																Spans: {traceData.payload.totalSpansCount}
															</span>
															<span
																className={cx(styles.collapseCountItem, {
																	[styles.hasErrors]: traceData.payload.totalErrorSpansCount > 0,
																})}
															>
																<TriangleAlert size={13} />
																Errors: {traceData.payload.totalErrorSpansCount ?? 0}
															</span>
														</span>
													) : null}
												</div>
											),
											children: (
												<ResizableBox defaultHeight={300} minHeight={100} maxHeight={400}>
													<TraceFlamegraph
														filteredSpanIds={filteredSpanIds}
														isFilterActive={isFilterActive}
														selectedSpan={selectedSpan}
														totalSpansCount={totalSpansCount}
													/>
												</ResizableBox>
											),
										},
									]}
								/>

								<Collapse
									// @ts-expect-error motion is passed through to rc-collapse to disable animation
									motion={false}
									activeKey={activeKeys.filter((k) => k === 'waterfall')}
									onChange={(): void => handleCollapseChange('waterfall')}
									size="small"
									expandIcon={renderPanelExpandIcon}
									className={cx(styles.waterfallCollapse, {
										[styles.isDocked]: isWaterfallDocked,
									})}
									items={[
										{
											key: 'waterfall',
											label: 'Waterfall',
											children: activeKeys.includes('waterfall')
												? waterfallChildren
												: null,
										},
									]}
								/>

								{panelState.isOpen && isDocked && (
									<div className={styles.dockedSpanDetails}>
										<SpanDetailsPanel
											panelState={panelState}
											selectedSpan={selectedSpan}
											variant={SpanDetailVariant.DOCKED}
											onVariantChange={handleVariantChange}
											traceStartTime={traceData?.payload?.startTimestampMillis}
											traceEndTime={traceData?.payload?.endTimestampMillis}
										/>
									</div>
								)}
							</div>

							{showRightDock && (
								<ResizableBox
									handle="left"
									defaultWidth={rightDockWidth}
									minWidth={RIGHT_DOCK_MIN}
									maxWidth={RIGHT_DOCK_MAX}
									onResize={setRightDockWidth}
									className={styles.rightDock}
								>
									<SpanDetailsPanel
										panelState={panelState}
										selectedSpan={selectedSpan}
										variant={SpanDetailVariant.DOCKED_RIGHT}
										onVariantChange={handleVariantChange}
										traceStartTime={traceData?.payload?.startTimestampMillis}
										traceEndTime={traceData?.payload?.endTimestampMillis}
									/>
								</ResizableBox>
							)}
						</div>

						{panelState.isOpen && spanDetailVariant === SpanDetailVariant.DIALOG && (
							<SpanDetailsPanel
								panelState={panelState}
								selectedSpan={selectedSpan}
								variant={SpanDetailVariant.DIALOG}
								onVariantChange={handleVariantChange}
								traceStartTime={traceData?.payload?.startTimestampMillis}
								traceEndTime={traceData?.payload?.endTimestampMillis}
							/>
						)}
					</>
				)}
			</div>
		</TraceStoreSync>
	);
}

export default TraceDetailsV3;
