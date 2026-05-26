/* eslint-disable sonarjs/cognitive-complexity */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChartNoAxesGantt, TriangleAlert } from '@signozhq/icons';
import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { Collapse } from 'antd';
import { useDetailsPanel } from 'components/DetailsPanel';
import WarningPopover from 'components/WarningPopover/WarningPopover';
import { LOCALSTORAGE } from 'constants/localStorage';
import useGetTraceV3 from 'hooks/trace/useGetTraceV3';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import NoData from 'pages/TraceDetailV2/NoData/NoData';
import { ResizableBox } from 'periscope/components/ResizableBox';
import {
	SpanV3,
	TraceDetailV3URLProps,
	WaterfallAggregationRequest,
} from 'types/api/trace/getTraceV3';

import { COLOR_BY_FIELDS } from './constants';
import TraceStoreSync from './stores/TraceStoreSync';
import { AGGREGATIONS } from './utils/aggregations';
import { SpanDetailVariant } from './SpanDetailsPanel/constants';
import SpanDetailsPanel from './SpanDetailsPanel/SpanDetailsPanel';
import type { TraceMetadataForHeader } from './TraceDetailsHeader/TraceDetailsHeader';
import TraceDetailsHeader from './TraceDetailsHeader/TraceDetailsHeader';
import { FLAMEGRAPH_SPAN_LIMIT } from './TraceFlamegraph/constants';
import TraceFlamegraph from './TraceFlamegraph/TraceFlamegraph';
import TraceWaterfall from './TraceWaterfall/TraceWaterfall';
import { IInterestedSpan } from './TraceWaterfall/types';
import { getAncestorSpanIds } from './TraceWaterfall/utils';

import cx from 'classnames';

import styles from './TraceDetailsV3.module.scss';

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

	// Hardcoded for now — fetch aggregations for all 3 candidate color-by fields
	// upfront so a future color-by-field switch doesn't need to refetch.
	const waterfallAggregationsRequest = useMemo<WaterfallAggregationRequest[]>(
		() =>
			COLOR_BY_FIELDS.flatMap((field) => [
				{ field, aggregation: AGGREGATIONS.EXEC_TIME_PCT },
				{ field, aggregation: AGGREGATIONS.SPAN_COUNT },
			]),
		[],
	);

	// Once all spans are loaded (frontend mode), freeze query params so
	// subsequent interestedSpanId changes don't trigger unnecessary refetches.
	const fullDataLoadedRef = useRef(false);
	const frozenParamsRef = useRef({
		selectedSpanId: interestedSpanId.spanId,
		isSelectedSpanIDUnCollapsed: interestedSpanId.isUncollapsed,
		uncollapsedSpans: uncollapsedNodes,
		aggregations: waterfallAggregationsRequest,
	});

	const queryParams = fullDataLoadedRef.current
		? frozenParamsRef.current
		: {
				selectedSpanId: interestedSpanId.spanId,
				isSelectedSpanIDUnCollapsed: interestedSpanId.isUncollapsed,
				uncollapsedSpans: uncollapsedNodes,
				aggregations: waterfallAggregationsRequest,
			};

	const {
		data: traceData,
		isFetching: isFetchingTraceData,
		error: errorFetchingTraceData,
	} = useGetTraceV3({
		traceId,
		uncollapsedSpans: queryParams.uncollapsedSpans,
		selectedSpanId: queryParams.selectedSpanId,
		isSelectedSpanIDUnCollapsed: queryParams.isSelectedSpanIDUnCollapsed,
		aggregations: queryParams.aggregations,
	});

	const allSpans = traceData?.payload?.spans || [];
	const totalSpansCount = traceData?.payload?.totalSpansCount || 0;
	const isFullDataLoaded =
		totalSpansCount > 0 && totalSpansCount <= allSpans.length;

	// Lock the ref once we confirm all data is loaded
	if (isFullDataLoaded && !fullDataLoadedRef.current) {
		fullDataLoadedRef.current = true;
		frozenParamsRef.current = {
			selectedSpanId: interestedSpanId.spanId,
			isSelectedSpanIDUnCollapsed: interestedSpanId.isUncollapsed,
			uncollapsedSpans: uncollapsedNodes,
			aggregations: waterfallAggregationsRequest,
		};
	}

	useEffect(() => {
		allSpansRef.current = allSpans;
	}, [allSpans]);

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
		<TraceStoreSync aggregations={traceData?.payload?.aggregations}>
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
																/>
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
