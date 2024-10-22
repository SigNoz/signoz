import getTraceDetails from 'api/trace/getTraceDetails';
import TraceDetailV2 from 'container/TraceDetailV2/TraceDetailV2';
import useUrlQuery from 'hooks/useUrlQuery';
import { defaultTo } from 'lodash-es';
import { useState } from 'react';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { TraceDetailsProps } from 'types/api/trace/getTraceDetails';

function TraceDetailsV2(): JSX.Element {
	const { id: traceID } = useParams<TraceDetailsProps>();
	const urlQuery = useUrlQuery();
	const [spanID, setSpanID] = useState<string>(urlQuery.get('spanId') || '');
	const [uncollapsedNodes, setUncollapsedNodes] = useState<string[]>([]);

	const { data: spansData, isLoading: isLoadingTraceDetails } = useQuery({
		queryFn: () =>
			getTraceDetails({
				traceID,
				spanID,
				uncollapsedNodes,
			}),
		queryKey: [spanID, traceID, uncollapsedNodes],
	});

	return (
		<TraceDetailV2
			traceDetailsResponse={defaultTo(spansData?.payload, undefined)}
			isLoadingTraceDetails={isLoadingTraceDetails}
			setUncollapsedNodes={setUncollapsedNodes}
			setSpanID={setSpanID}
		/>
	);
}

export default TraceDetailsV2;
