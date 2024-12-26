import './TraceWaterfall.styles.scss';

import { AxiosError } from 'axios';
import Spinner from 'components/Spinner';
import useGetTraceV2 from 'hooks/trace/useGetTraceV2';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TraceDetailV2URLProps } from 'types/api/trace/getTraceV2';

import { TraceWaterfallStates } from './constants';
import Error from './TraceWaterfallStates/Error/Error';
import NoData from './TraceWaterfallStates/NoData/NoData';
import Success from './TraceWaterfallStates/Success/Success';

/**
 * render a virtuoso list with the spans recieved from the trace details API call
 * trigger API call on bottom reached and on top reached, set the interestedSpanId and make that as the query key along with uncollapsed nodes
 * render the tree structure based on hasChildren and the level. the left spacing depends on the level. a window pane with horizontal scroll for the same as well.
 * min width to be set [] and then scroll post that based on content
 */

function TraceWaterfall(): JSX.Element {
	const { id: traceId } = useParams<TraceDetailV2URLProps>();
	const [interestedSpanId, setInterestedSpanId] = useState<string | null>();
	const [uncollapsedNodes, setUncollapsedNodes] = useState<string[]>([]);
	const {
		data: traceData,
		isFetching: isFetchingTraceData,
		error: errorFetchingTraceData,
	} = useGetTraceV2({
		traceId,
		interestedSpanId: interestedSpanId || '',
		uncollapsedNodes,
	});

	// get the current state of trace waterfall based on the API lifecycle
	const traceWaterfallState = useMemo(() => {
		if (isFetchingTraceData) {
			if (
				traceData &&
				traceData.payload &&
				traceData.payload.spans &&
				traceData.payload.spans.length > 0
			) {
				return TraceWaterfallStates.FETCHING_WITH_OLD_DATA_PRESENT;
			}
			return TraceWaterfallStates.LOADING;
		}
		if (errorFetchingTraceData) {
			return TraceWaterfallStates.ERROR;
		}
		if (
			traceData &&
			traceData.payload &&
			traceData.payload.spans &&
			traceData.payload.spans.length === 0
		) {
			return TraceWaterfallStates.NO_DATA;
		}

		return TraceWaterfallStates.SUCCESS;
	}, [errorFetchingTraceData, isFetchingTraceData, traceData]);

	// capture the spans from the response, since we do not need to do any manipulation on the same we will keep this as a simple constant [ memoized ]
	const spans = useMemo(() => {
		if (traceWaterfallState === TraceWaterfallStates.SUCCESS) {
			// we do not need null checks here as the traceWaterfallState gurantees that but needed for typechecking
			return traceData?.payload?.spans || [];
		}

		return [];
	}, [traceData?.payload?.spans, traceWaterfallState]);

	// get the content based on the current state of the trace waterfall
	const getContent = useMemo(() => {
		switch (traceWaterfallState) {
			case TraceWaterfallStates.LOADING:
				return <Spinner tip="Fetching the trace!" />;
			case TraceWaterfallStates.ERROR:
				return <Error error={errorFetchingTraceData as AxiosError} />;
			case TraceWaterfallStates.NO_DATA:
				return <NoData id={traceId} />;
			case TraceWaterfallStates.SUCCESS:
			case TraceWaterfallStates.FETCHING_WITH_OLD_DATA_PRESENT:
				return (
					<Success
						spans={spans}
						traceWaterfallState={traceWaterfallState}
						interestedSpanId={interestedSpanId || ''}
						uncollapsedNodes={uncollapsedNodes}
						setInterestedSpanId={setInterestedSpanId}
						setUncollapsedNodes={setUncollapsedNodes}
					/>
				);
			default:
				return <Spinner tip="Fetching the trace!" />;
		}
	}, [
		errorFetchingTraceData,
		interestedSpanId,
		spans,
		traceId,
		traceWaterfallState,
		uncollapsedNodes,
	]);

	return <div className="trace-waterfall">{getContent}</div>;
}

export default TraceWaterfall;
