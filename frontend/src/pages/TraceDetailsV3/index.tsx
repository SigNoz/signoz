import { useCallback, useRef, useState } from 'react';

import { TraceDetailsTab } from './constants';
import { useTraceDetailsTab } from './hooks/useTraceDetailsTab';
import TraceDetailsHeader from './TraceDetailsHeader/TraceDetailsHeader';
import TraceDetailsOverview from './TraceDetailsOverview/TraceDetailsOverview';
import TraceDetailsThread from './TraceDetailsThread/TraceDetailsThread';
import TraceDetailsWrapper from './TraceDetailsWrapper/TraceDetailsWrapper';

function TraceDetailsV3(): JSX.Element {
	const [tab] = useTraceDetailsTab();
	const isOverview = tab === TraceDetailsTab.Overview;
	const [filteredSpanIds, setFilteredSpanIds] = useState<string[]>([]);
	const [isFilterActive, setIsFilterActive] = useState(false);
	const [hasTraceData, setHasTraceData] = useState(false);
	// Tracks which traceId the load event already fired for, so navigating
	// between traces (the route component stays mounted) re-fires it once each.
	const dataLoadedFiredForRef = useRef<string>('');

	const handleFilteredSpansChange = useCallback(
		(spanIds: string[], isActive: boolean): void => {
			setFilteredSpanIds(spanIds);
			setIsFilterActive(isActive);
		},
		[],
	);

	return (
		<TraceDetailsWrapper>
			<TraceDetailsHeader
				onFilteredSpansChange={handleFilteredSpansChange}
				showTraceDetailsHeaderOptions={hasTraceData}
			/>
			{isOverview ? (
				<TraceDetailsOverview
					filteredSpanIds={filteredSpanIds}
					isFilterActive={isFilterActive}
					onHasTraceDataChange={setHasTraceData}
					dataLoadedFiredForRef={dataLoadedFiredForRef}
				/>
			) : (
				<TraceDetailsThread />
			)}
		</TraceDetailsWrapper>
	);
}

export default TraceDetailsV3;
