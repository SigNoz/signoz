import type { UseTraceWaterfallDataResult } from 'pages/TraceDetailsV3/hooks/useTraceWaterfallData';
import TraceFlamegraph from 'pages/TraceDetailsV3/TraceFlamegraph/TraceFlamegraph';
import TraceWaterfall from 'pages/TraceDetailsV3/TraceWaterfall/TraceWaterfall';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import TraceViewLoader from './TraceViewLoader';

export type DrawerTraceViewProps = {
	traceId: string;
	waterfall: UseTraceWaterfallDataResult;
	totalSpansCount: number | undefined;
	totalErrorSpansCount: number | undefined;
	/** The drawer's span; the waterfall may not be loaded to supply it. */
	selectedSpan: SpanV3 | undefined;
};

const NO_FILTERED_SPANS: string[] = [];
const VIEW_LOADER = <TraceViewLoader />;

export function DrawerWaterfall({
	traceId,
	waterfall,
}: DrawerTraceViewProps): JSX.Element {
	return (
		<TraceWaterfall
			traceId={traceId}
			traceData={waterfall.traceData}
			isFetchingTraceData={waterfall.isFetchingTraceData}
			errorFetchingTraceData={waterfall.errorFetchingTraceData}
			interestedSpanId={waterfall.interestedSpanId}
			setInterestedSpanId={waterfall.setInterestedSpanId}
			uncollapsedNodes={waterfall.uncollapsedNodes}
			isFullDataLoaded={waterfall.isFullDataLoaded}
			localUncollapsedNodes={waterfall.localUncollapsedNodes}
			setLocalUncollapsedNodes={waterfall.setLocalUncollapsedNodes}
			selectedSpan={waterfall.selectedSpan}
			setSelectedSpan={waterfall.setSelectedSpan}
			filteredSpanIds={NO_FILTERED_SPANS}
			isFilterActive={false}
			loadingFallback={VIEW_LOADER}
		/>
	);
}

export function DrawerFlamegraph({
	traceId,
	totalSpansCount,
	selectedSpan,
}: DrawerTraceViewProps): JSX.Element {
	return (
		<TraceFlamegraph
			traceId={traceId}
			filteredSpanIds={NO_FILTERED_SPANS}
			isFilterActive={false}
			selectedSpan={selectedSpan}
			totalSpansCount={totalSpansCount ?? 0}
			loadingFallback={VIEW_LOADER}
		/>
	);
}
