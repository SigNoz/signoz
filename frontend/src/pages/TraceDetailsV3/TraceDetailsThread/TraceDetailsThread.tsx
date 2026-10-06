import { useParams } from 'react-router-dom';
import { TraceDetailV3URLProps } from 'types/api/trace/getTraceV3';

import { MOCK_TRACE_METADATA } from '../TraceDetailsHeader/mockTraceMetadata';
import TraceDetailsHeader from '../TraceDetailsHeader/TraceDetailsHeader';

function TraceDetailsThread(): JSX.Element {
	const { id: traceId = '' } = useParams<TraceDetailV3URLProps>();

	return (
		<div data-testid="trace-details-thread">
			<TraceDetailsHeader
				filterMetadata={{
					startTime: MOCK_TRACE_METADATA.startTimestampMillis / 1e3,
					endTime: MOCK_TRACE_METADATA.endTimestampMillis / 1e3,
					traceId,
				}}
				onFilteredSpansChange={(): void => {}}
				traceMetadata={MOCK_TRACE_METADATA}
			/>
		</div>
	);
}

export default TraceDetailsThread;
