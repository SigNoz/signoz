import { useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { ButtonGroup } from '@signozhq/ui/button-group';
import { ChevronDown, ChevronUp, CornerUpRight } from '@signozhq/icons';
import { useGetTraceSummary } from 'api/generated/services/tracedetail';
import { HeaderAction } from 'components/DetailsPanel';
import type { UseRowNavigationResult } from 'components/TanStackTableView/useRowNavigation';
import { getTraceLink } from 'container/TracesExplorer/ListView/utils';
import { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';
import { SpanDetailVariant } from 'pages/TraceDetailsV3/SpanDetailsPanel/constants';
import SpanDetailsPanel from 'pages/TraceDetailsV3/SpanDetailsPanel/SpanDetailsPanel';
import { openInNewTab } from 'utils/navigation';

import { useArrowKeyNavigation } from './useArrowKeyNavigation';
import { toSpanV3 } from './utils';

export type SpanDrawerProps = {
	row: TracesTableRow | null;
	onClose: () => void;
	navigation: UseRowNavigationResult;
};

function SpanDrawer({
	row,
	onClose,
	navigation,
}: SpanDrawerProps): JSX.Element {
	const { goToPrev, goToNext, isPrevDisabled, isNextDisabled } = navigation;
	const isOpen = row !== null;

	useArrowKeyNavigation({ enabled: isOpen, onPrev: goToPrev, onNext: goToNext });

	const panelState = useMemo(
		() => ({ isOpen, open: (): void => {}, close: onClose }),
		[isOpen, onClose],
	);

	const headerActions = useMemo((): HeaderAction[] => {
		if (!row) {
			return [];
		}
		return [
			{
				key: 'view-full-trace',
				component: (
					<Button
						variant="outlined"
						color="secondary"
						size="md"
						prefix={<CornerUpRight />}
						onClick={(): void => openInNewTab(getTraceLink(row))}
						testId="span-drawer-view-full-trace"
					>
						View full trace
					</Button>
				),
			},
			{
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
								onClick: goToPrev,
								disabled: isPrevDisabled,
								disabledTooltip: 'No previous span on this page',
							},
							{
								value: 'next',
								icon: <ChevronDown />,
								ariaLabel: 'Next span',
								onClick: goToNext,
								disabled: isNextDisabled,
								disabledTooltip: 'No next span on this page',
							},
						]}
					/>
				),
			},
		];
	}, [row, goToPrev, goToNext, isPrevDisabled, isNextDisabled]);

	const span = useMemo(() => (row ? toSpanV3(row) : undefined), [row]);

	const traceId = span?.trace_id ?? '';
	const { data: traceSummary, isLoading: isTraceBoundsLoading } =
		useGetTraceSummary(
			{ traceID: traceId },
			{ query: { enabled: !!traceId, retry: false } },
		);

	return (
		<SpanDetailsPanel
			panelState={panelState}
			selectedSpan={span}
			variant={SpanDetailVariant.DRAWER}
			headerActions={headerActions}
			traceStartTime={traceSummary?.data?.startTimestampMillis}
			traceEndTime={traceSummary?.data?.endTimestampMillis}
			isTraceBoundsLoading={isTraceBoundsLoading}
		/>
	);
}

export default SpanDrawer;
