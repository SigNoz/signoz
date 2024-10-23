import getTraceDetails from 'api/trace/getTraceDetails';
import TraceDetailV2 from 'container/TraceDetailV2/TraceDetailV2';
import useUrlQuery from 'hooks/useUrlQuery';
import { defaultTo } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { TraceDetailsProps } from 'types/api/trace/getTraceDetails';

function TraceDetailsV2(): JSX.Element {
	const { id: traceID } = useParams<TraceDetailsProps>();
	const urlQuery = useUrlQuery();
	const [spanID, setSpanID] = useState<string>(urlQuery.get('spanId') || '');
	const [uncollapsedNodes, setUncollapsedNodes] = useState<string[]>([]);

	const { data: spansData } = useQuery({
		queryFn: () =>
			getTraceDetails({
				traceID,
				spanID,
				uncollapsedNodes,
			}),
		queryKey: [spanID, traceID, ...uncollapsedNodes],
		keepPreviousData: true,
	});

	useEffect(() => {
		if (uncollapsedNodes.length === 0 && spansData?.payload?.uncollapsedNodes) {
			setUncollapsedNodes(spansData?.payload?.uncollapsedNodes);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [spansData]);

	return (
		<TraceDetailV2
			traceDetailsResponse={defaultTo(spansData?.payload, undefined)}
			uncollapsedNodes={uncollapsedNodes}
			setUncollapsedNodes={setUncollapsedNodes}
			spanID={spanID}
			setSpanID={setSpanID}
		/>
	);
}

export default TraceDetailsV2;
