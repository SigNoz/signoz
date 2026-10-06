import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TraceDetailV3URLProps } from 'types/api/trace/getTraceV3';

import { TraceDetailsTab } from './constants';
import { useTraceDetailsTab } from './hooks/useTraceDetailsTab';
import TraceStoreSync from './stores/TraceStoreSync';
import { MOCK_TRACE_METADATA } from './TraceDetailsHeader/mockTraceMetadata';
import TraceDetailsHeader from './TraceDetailsHeader/TraceDetailsHeader';
import TraceDetailsOverview from './TraceDetailsOverview/TraceDetailsOverview';
import TraceDetailsThread from './TraceDetailsThread/TraceDetailsThread';

import styles from './TraceDetailsV3.module.scss';

function TraceDetailsV3(): JSX.Element {
	const { id: traceId = '' } = useParams<TraceDetailV3URLProps>();
	const [tab] = useTraceDetailsTab();
	const [filteredSpanIds, setFilteredSpanIds] = useState<string[]>([]);
	const [isFilterActive, setIsFilterActive] = useState(false);

	const handleFilteredSpansChange = useCallback(
		(spanIds: string[], isActive: boolean): void => {
			setFilteredSpanIds(spanIds);
			setIsFilterActive(isActive);
		},
		[],
	);

	return (
		<TraceStoreSync>
			<div className={styles.root}>
				<TraceDetailsHeader
					filterMetadata={{
						startTime: MOCK_TRACE_METADATA.startTimestampMillis / 1e3,
						endTime: MOCK_TRACE_METADATA.endTimestampMillis / 1e3,
						traceId,
					}}
					onFilteredSpansChange={handleFilteredSpansChange}
					isDataLoaded
					traceMetadata={MOCK_TRACE_METADATA}
				/>
				{tab === TraceDetailsTab.Overview ? (
					<TraceDetailsOverview
						filteredSpanIds={filteredSpanIds}
						isFilterActive={isFilterActive}
					/>
				) : (
					<TraceDetailsThread />
				)}
			</div>
		</TraceStoreSync>
	);
}

export default TraceDetailsV3;
