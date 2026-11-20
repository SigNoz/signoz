import { useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { ButtonGroup } from '@signozhq/ui/button-group';
import { ChevronDown, ChevronUp, CornerUpRight } from '@signozhq/icons';
import { useGetTraceSummary } from 'api/generated/services/tracedetail';
import { HeaderAction } from 'components/DetailsPanel';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { TRACE_QUERY_STALE_TIME_MS } from 'hooks/trace/constants';
import type { UseRowNavigationResult } from 'components/TanStackTableView/useRowNavigation';
import {
	logOpenTraceClicked,
	OpenTraceSource,
} from 'container/TracesExplorer/events';
import { getTraceLink } from 'container/TracesExplorer/ListView/utils';
import { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';
import { useTraceWaterfallData } from 'pages/TraceDetailsV3/hooks/useTraceWaterfallData';
import { SpanDetailVariant } from 'pages/TraceDetailsV3/SpanDetailsPanel/constants';
import SpanDetailsPanel from 'pages/TraceDetailsV3/SpanDetailsPanel/SpanDetailsPanel';
import { FLAMEGRAPH_SPAN_LIMIT } from 'pages/TraceDetailsV3/TraceFlamegraph/constants';
import { openInNewTab } from 'utils/navigation';

import SpanDrawerTracePane from './SpanDrawerTracePane';
import SpanDrawerTraceSection from './SpanDrawerTraceSection';
import { useArrowKeyNavigation } from './useArrowKeyNavigation';
import { useDrawerTraceLayout } from './useDrawerTraceLayout';
import { useDrawerSpan } from './useDrawerSpan';

export type SpanDrawerProps = {
	traceId: string | null;
	spanId: string | null;
	onClose: () => void;
	/** Null when the open span is not a row of the list. */
	navigation: UseRowNavigationResult | null;
	/** The list row of the open span; shown until the waterfall's copy loads. */
	seedRow: TracesTableRow | null;
	/** The list's first load; until it settles a missing `seedRow` is not final. */
	isListLoading?: boolean;
};

const noop = (): void => {};

function SpanDrawer({
	traceId,
	spanId,
	onClose,
	navigation,
	seedRow,
	isListLoading = false,
}: SpanDrawerProps): JSX.Element {
	const isOpen = !!traceId && !!spanId;

	useArrowKeyNavigation({
		enabled: isOpen && !!navigation,
		onPrev: navigation?.goToPrev ?? noop,
		onNext: navigation?.goToNext ?? noop,
	});

	const panelState = useMemo(
		() => ({ isOpen, open: (): void => {}, close: onClose }),
		[isOpen, onClose],
	);

	const { data: traceSummary, isLoading: isTraceBoundsLoading } =
		useGetTraceSummary(
			{ traceID: traceId ?? '' },
			{
				query: {
					enabled: !!traceId,
					retry: false,
					staleTime: TRACE_QUERY_STALE_TIME_MS,
				},
			},
		);
	// No trace view mounts before the span count says whether the flame graph fits.
	const layout = useDrawerTraceLayout({
		traceId,
		hasFlamegraph: isTraceBoundsLoading
			? undefined
			: (traceSummary?.data?.totalSpansCount ?? 0) <= FLAMEGRAPH_SPAN_LIMIT,
	});
	const { isSplitLayout, toggleLayout } = layout;

	// A list row already carries the full span, so the waterfall is fetched only
	// to show it, or for a span the list doesn't have once the list has loaded.
	const isWaterfallNeeded =
		layout.isWaterfallShown || (!seedRow && !isListLoading);
	const waterfall = useTraceWaterfallData(traceId ?? '', {
		enabled: isWaterfallNeeded,
	});
	const { span, isStale } = useDrawerSpan({
		traceId,
		spanId,
		waterfallSpans: waterfall.allSpans,
		seedRow,
	});

	const headerActions = useMemo((): HeaderAction[] => {
		if (!traceId || !spanId) {
			return [];
		}
		const actions: HeaderAction[] = [
			{
				key: 'layout',
				component: (
					<Button
						variant="ghost"
						color="secondary"
						size="md"
						onClick={toggleLayout}
						testId="span-drawer-layout-toggle"
					>
						{isSplitLayout ? 'Split' : 'Stacked'}
					</Button>
				),
			},
			{
				key: 'view-full-trace',
				component: (
					<Button
						variant="outlined"
						color="secondary"
						size="md"
						prefix={<CornerUpRight />}
						onClick={(): void => {
							logOpenTraceClicked(PANEL_TYPES.LIST, OpenTraceSource.SpanDrawer);
							openInNewTab(getTraceLink({ trace_id: traceId, span_id: spanId }));
						}}
						testId="span-drawer-view-full-trace"
					>
						View full trace
					</Button>
				),
			},
		];
		if (navigation) {
			actions.push({
				key: 'nav',
				component: (
					<ButtonGroup
						variant="outlined"
						color="secondary"
						size="md"
						testId="span-drawer-nav"
						items={[
							{
								value: 'prev',
								icon: <ChevronUp />,
								ariaLabel: 'Previous span',
								onClick: navigation.goToPrev,
								disabled: navigation.isPrevDisabled,
								disabledTooltip: 'No previous span on this page',
							},
							{
								value: 'next',
								icon: <ChevronDown />,
								ariaLabel: 'Next span',
								onClick: navigation.goToNext,
								disabled: navigation.isNextDisabled,
								disabledTooltip: 'No next span on this page',
							},
						]}
					/>
				),
			});
		}
		return actions;
	}, [traceId, spanId, navigation, isSplitLayout, toggleLayout]);

	const traceViewProps = traceId
		? {
				traceId,
				waterfall,
				totalSpansCount: traceSummary?.data?.totalSpansCount,
				totalErrorSpansCount: traceSummary?.data?.totalErrorSpansCount,
				selectedSpan: isStale ? undefined : span,
			}
		: null;

	return (
		<SpanDetailsPanel
			panelState={panelState}
			selectedSpan={span}
			isStale={isStale}
			variant={SpanDetailVariant.DRAWER}
			headerActions={headerActions}
			traceStartTime={traceSummary?.data?.startTimestampMillis}
			traceEndTime={traceSummary?.data?.endTimestampMillis}
			isTraceBoundsLoading={isTraceBoundsLoading}
			tracePane={
				traceViewProps && isSplitLayout ? (
					<SpanDrawerTracePane viewProps={traceViewProps} layout={layout} />
				) : null
			}
			traceSection={
				traceViewProps && !isSplitLayout ? (
					<SpanDrawerTraceSection viewProps={traceViewProps} layout={layout} />
				) : null
			}
		/>
	);
}

export default SpanDrawer;
