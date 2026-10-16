import { useCallback, useEffect, useState } from 'react';

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

	const handleFilteredSpansChange = useCallback(
		(spanIds: string[], isActive: boolean): void => {
			setFilteredSpanIds(spanIds);
			setIsFilterActive(isActive);
		},
		[],
	);

	// The filter query lives in Filters' local state, which unmounts with the
	// Overview tab; drop its result too so both start empty on return.
	useEffect(() => {
		if (!isOverview) {
			handleFilteredSpansChange([], false);
		}
	}, [isOverview, handleFilteredSpansChange]);

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
				/>
			) : (
				<TraceDetailsThread />
			)}
		</TraceDetailsWrapper>
	);
}

export default TraceDetailsV3;
