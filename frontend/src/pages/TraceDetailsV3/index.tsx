/* eslint-disable sonarjs/cognitive-complexity */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
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
import { SpanV3, TraceDetailV3URLProps } from 'types/api/trace/getTraceV3';

import { SpanDetailVariant } from './SpanDetailsPanel/constants';
import SpanDetailsPanel from './SpanDetailsPanel/SpanDetailsPanel';
import TraceDetailsHeader from './TraceDetailsHeader/TraceDetailsHeader';
import { FLAMEGRAPH_SPAN_LIMIT } from './TraceFlamegraph/constants';
import TraceFlamegraph from './TraceFlamegraph/TraceFlamegraph';
import TraceWaterfall, {
	IInterestedSpan,
} from './TraceWaterfall/TraceWaterfall';
import { getAncestorSpanIds } from './TraceWaterfall/utils';

import './TraceDetailsV3.styles.scss';

function TraceDetailsV3(): JSX.Element {
	const { id: traceId } = useParams<TraceDetailV3URLProps>();
	const urlQuery = useUrlQuery();
	const [interestedSpanId, setInterestedSpanId] = useState<IInterestedSpan>(
		() => ({
			spanId: urlQuery.get('spanId') || '',
			isUncollapsed: urlQuery.get('spanId') !== '',
			scrollToSpan: true,
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

	useEffect(() => {
		const spanId = urlQuery.get('spanId') || '';
		// Only update interestedSpanId when a new span is selected,
		// not when it's cleared (panel close) — avoids unnecessary API refetch
		if (!spanId) {
			return;
		}
		setInterestedSpanId({
			spanId,
			isUncollapsed: true,
			scrollToSpan: true,
		});
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
	} = useGetTraceV3({
		traceId,
		uncollapsedSpans: queryParams.uncollapsedSpans,
		selectedSpanId: queryParams.selectedSpanId,
		isSelectedSpanIDUnCollapsed: queryParams.isSelectedSpanIDUnCollapsed,
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
		};
	}

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

	// Frontend mode: auto-expand ancestors of the selected span so it becomes visible
	useEffect(() => {
		if (!isFullDataLoaded || !interestedSpanId.spanId || allSpans.length === 0) {
			return;
		}
		const ancestors = getAncestorSpanIds(allSpans, interestedSpanId.spanId);
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
	}, [isFullDataLoaded, interestedSpanId.spanId, allSpans]);

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
			) as SpanDetailVariant) || SpanDetailVariant.DOCKED,
	);

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

	const showNoData =
		!isFetchingTraceData &&
		(!!errorFetchingTraceData || !traceData?.payload?.spans?.length);

	const isDocked = spanDetailVariant === SpanDetailVariant.DOCKED;
	const isWaterfallDocked = panelState.isOpen && isDocked;

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
		<div className="trace-details-v3">
			<TraceDetailsHeader
				filterMetadata={filterMetadata}
				onFilteredSpansChange={handleFilteredSpansChange}
				noData={showNoData}
			/>

			{showNoData ? (
				<NoData />
			) : (
				<>
					<div className="trace-details-v3__content">
						<Collapse
							// @ts-expect-error motion is passed through to rc-collapse to disable animation
							motion={false}
							activeKey={activeKeys.filter((k) => k === 'flame')}
							onChange={(): void => handleCollapseChange('flame')}
							size="small"
							className="trace-details-v3__flame-collapse"
							items={[
								{
									key: 'flame',
									label: (
										<div className="trace-details-v3__collapse-label">
											<span>Flame Graph</span>
											{traceData?.payload?.totalSpansCount ? (
												<span className="trace-details-v3__collapse-count">
													{traceData.payload.totalSpansCount} spans
													{traceData.payload.totalSpansCount > FLAMEGRAPH_SPAN_LIMIT && (
														<WarningPopover
															message="The total span count exceeds the visualization limit. Displaying a sampled subset of spans."
															placement="bottomRight"
															autoAdjustOverflow={false}
														/>
													)}
												</span>
											) : null}
										</div>
									),
									children: (
										<ResizableBox defaultHeight={300} minHeight={100} maxHeight={400}>
											<TraceFlamegraph
												filteredSpanIds={filteredSpanIds}
												isFilterActive={isFilterActive}
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
							className={`trace-details-v3__waterfall-collapse${
								isWaterfallDocked ? ' trace-details-v3__waterfall-collapse--docked' : ''
							}`}
							items={[
								{
									key: 'waterfall',
									label: 'Waterfall',
									children: activeKeys.includes('waterfall') ? waterfallChildren : null,
								},
							]}
						/>

						{panelState.isOpen && isDocked && (
							<div className="trace-details-v3__docked-span-details">
								<SpanDetailsPanel
									panelState={panelState}
									selectedSpan={selectedSpan}
									variant={SpanDetailVariant.DOCKED}
									onVariantChange={handleVariantChange}
									traceStartTime={traceData?.payload?.startTimestampMillis}
									traceEndTime={traceData?.payload?.endTimestampMillis}
									serviceExecTime={traceData?.payload?.serviceNameToTotalDurationMap}
								/>
							</div>
						)}
					</div>

					{panelState.isOpen && !isDocked && (
						<SpanDetailsPanel
							panelState={panelState}
							selectedSpan={selectedSpan}
							variant={SpanDetailVariant.DIALOG}
							onVariantChange={handleVariantChange}
							traceStartTime={traceData?.payload?.startTimestampMillis}
							traceEndTime={traceData?.payload?.endTimestampMillis}
							serviceExecTime={traceData?.payload?.serviceNameToTotalDurationMap}
						/>
					)}
				</>
			)}
		</div>
	);
}

export default TraceDetailsV3;
