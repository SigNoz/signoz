import './TraceWaterfall.styles.scss';

import useGetTraceV2 from 'hooks/trace/useGetTraceV2';
import { useParams } from 'react-router-dom';
import { Props as TraceDetailProps } from 'types/api/trace/getTraceItem';

/**
 * render a virtuoso list with the spans recieved from the trace details API call
 * trigger API call on bottom reached and on top reached, set the interestedSpanId and make that as the query key along with uncollapsed nodes
 * render the tree structure based on hasChildren and the level. the left spacing depends on the level. a window pane with horizontal scroll for the same as well.
 * min width to be set [] and then scroll post that based on content
 */

function TraceWaterfall(): JSX.Element {
	const { id: traceId } = useParams<TraceDetailProps>();
	const { data: traceData, isFetching: isFetchingTraceData } = useGetTraceV2({
		traceId,
		interestedSpanId: '',
		uncollapsedNodes: [],
	});

	console.log(traceData, isFetchingTraceData);
	return <div className="trace-waterfall">heelo!</div>;
}

export default TraceWaterfall;
