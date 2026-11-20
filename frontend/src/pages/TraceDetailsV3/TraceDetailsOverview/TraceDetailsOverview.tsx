/* eslint-disable sonarjs/cognitive-complexity */
import { MutableRefObject, useCallback, useEffect, useState } from 'react';
import { useAppParams } from 'lib/router/useAppParams';
import {
	ChartNoAxesGantt,
	ChevronDown,
	ChevronRight,
	Info,
	TriangleAlert,
} from '@signozhq/icons';
import getLocalStorageKey from 'api/browser/localstorage/get';
import { Collapse } from 'antd';
import { useDetailsPanel } from 'components/DetailsPanel';
import WarningPopover from 'components/WarningPopover/WarningPopover';
import { LOCALSTORAGE } from 'constants/localStorage';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { getUnstableCurrentSearchParams } from 'utils/getUnstableCurrentSearchParams';
import { ResizableBox } from 'periscope/components/ResizableBox';

import { TraceDetailsTab } from '../constants';
import { TraceDetailEventKeys, TraceDetailEvents } from '../events';
import { useSpanDetailsOpenedEvent } from '../hooks/useSpanDetailsOpenedEvent';
import { useSpanDetailVariant } from '../hooks/useSpanDetailVariant';
import { useTraceDetailLogEvent } from '../hooks/useTraceDetailLogEvent';
import { useTraceWaterfallData } from '../hooks/useTraceWaterfallData';
import NoData from '../NoData/NoData';
import { useTraceStore } from '../stores/traceStore';
import {
	SPAN_DETAILS_PANEL_MIN_WIDTH,
	SpanDetailVariant,
} from '../SpanDetailsPanel/constants';
import SpanDetailsPanel from '../SpanDetailsPanel/SpanDetailsPanel';
import { FLAMEGRAPH_SPAN_LIMIT } from '../TraceFlamegraph/constants';
import TraceFlamegraph from '../TraceFlamegraph/TraceFlamegraph';
import TraceWaterfall from '../TraceWaterfall/TraceWaterfall';

import cx from 'classnames';

import styles from './TraceDetailsOverview.module.scss';

// Lucide chevrons for the flame/waterfall accordion headers, matching the
// span-tree chevrons in the waterfall.
function renderPanelExpandIcon({
	isActive,
}: {
	isActive?: boolean;
}): JSX.Element {
	return isActive ? <ChevronDown size={14} /> : <ChevronRight size={14} />;
}

interface TraceDetailsOverviewProps {
	filteredSpanIds: string[];
	isFilterActive: boolean;
	onHasTraceDataChange: (hasTraceData: boolean) => void;
	dataLoadedFiredForRef: MutableRefObject<string>;
}

function TraceDetailsOverview({
	filteredSpanIds,
	isFilterActive,
	onHasTraceDataChange,
	dataLoadedFiredForRef,
}: TraceDetailsOverviewProps): JSX.Element {
	const { id: traceId } = useAppParams<'id'>();
	const {
		traceData,
		isFetchingTraceData,
		errorFetchingTraceData,
		allSpans,
		totalSpansCount,
		isFullDataLoaded,
		interestedSpanId,
		setInterestedSpanId,
		uncollapsedNodes,
		localUncollapsedNodes,
		setLocalUncollapsedNodes,
		selectedSpan,
		setSelectedSpan,
		selectedSpanId,
	} = useTraceWaterfallData(traceId || '');
	const { safeNavigate } = useSafeNavigate();

	const logTraceEvent = useTraceDetailLogEvent('v3', traceId || '');
	const colorByField = useTraceStore((s) => s.colorByField);
	const previewFieldsCount = useTraceStore((s) => s.previewFields.length);
	const userPrefsReady = useTraceStore((s) => s.userPreferences !== null);

	const handleSpanDetailsClose = useCallback((): void => {
		const params = getUnstableCurrentSearchParams();
		params.delete('spanId');
		safeNavigate({ search: params.toString() }, { replace: true });
	}, [safeNavigate]);

	const panelState = useDetailsPanel({
		entityId: selectedSpanId,
		onClose: handleSpanDetailsClose,
	});
	useSpanDetailsOpenedEvent({
		isOpen: panelState.isOpen,
		spanId: selectedSpan?.span_id,
		detailsTab: TraceDetailsTab.Overview,
		logTraceEvent,
	});

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
			[TraceDetailEventKeys.DetailsTab]: TraceDetailsTab.Overview,
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
		dataLoadedFiredForRef,
	]);

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

	const [spanDetailVariant, handleVariantChange] = useSpanDetailVariant();

	const RIGHT_DOCK_MIN = SPAN_DETAILS_PANEL_MIN_WIDTH;
	const RIGHT_DOCK_MAX = 720;
	const [rightDockWidth, setRightDockWidth] = useState(RIGHT_DOCK_MIN);

	const showNoData =
		!isFetchingTraceData &&
		(!!errorFetchingTraceData || !traceData?.payload?.spans?.length);

	const hasTraceData = !showNoData && allSpans.length > 0;

	useEffect(() => {
		onHasTraceDataChange(hasTraceData);
		return (): void => onHasTraceDataChange(false);
	}, [hasTraceData, onHasTraceDataChange]);

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
		<>
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
															Errors:{' '}
															{traceData.payload.totalErrorSpansCount ?? (
																<span className="translate-safe">{0}</span>
															)}
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
										children: activeKeys.includes('waterfall') ? waterfallChildren : null,
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
		</>
	);
}

export default TraceDetailsOverview;
