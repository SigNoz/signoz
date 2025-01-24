import './TraceWaterfall.styles.scss';

import { Skeleton } from 'antd';
import { AxiosError } from 'axios';
import Spinner from 'components/Spinner';
import { Dispatch, SetStateAction, useMemo } from 'react';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { GetTraceV2SuccessResponse, Span } from 'types/api/trace/getTraceV2';

import { TraceWaterfallStates } from './constants';
import Error from './TraceWaterfallStates/Error/Error';
import NoData from './TraceWaterfallStates/NoData/NoData';
import Success from './TraceWaterfallStates/Success/Success';

export interface IInterestedSpan {
	spanId: string;
	isUncollapsed: boolean;
}

interface ITraceWaterfallProps {
	traceId: string;
	uncollapsedNodes: string[];
	traceData:
		| SuccessResponse<GetTraceV2SuccessResponse, unknown>
		| ErrorResponse
		| undefined;
	isFetchingTraceData: boolean;
	errorFetchingTraceData: unknown;
	interestedSpanId: IInterestedSpan;
	setInterestedSpanId: Dispatch<SetStateAction<IInterestedSpan>>;
	setTraceFlamegraphStatsWidth: Dispatch<SetStateAction<number>>;
	selectedSpan: Span | undefined;
	setSelectedSpan: Dispatch<SetStateAction<Span | undefined>>;
}

function TraceWaterfall(props: ITraceWaterfallProps): JSX.Element {
	const {
		traceData,
		isFetchingTraceData,
		errorFetchingTraceData,
		interestedSpanId,
		traceId,
		uncollapsedNodes,
		setInterestedSpanId,
		setTraceFlamegraphStatsWidth,
		setSelectedSpan,
		selectedSpan,
	} = props;
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
	const spans = useMemo(() => traceData?.payload?.spans || [], [
		traceData?.payload?.spans,
	]);

	// get the content based on the current state of the trace waterfall
	const getContent = useMemo(() => {
		switch (traceWaterfallState) {
			case TraceWaterfallStates.LOADING:
				return (
					<div className="loading-skeleton">
						<Skeleton active paragraph={{ rows: 6 }} />
					</div>
				);
			case TraceWaterfallStates.ERROR:
				return <Error error={errorFetchingTraceData as AxiosError} />;
			case TraceWaterfallStates.NO_DATA:
				return <NoData id={traceId} />;
			case TraceWaterfallStates.SUCCESS:
			case TraceWaterfallStates.FETCHING_WITH_OLD_DATA_PRESENT:
				return (
					<Success
						spans={spans}
						traceMetadata={{
							traceId,
							startTime: traceData?.payload?.startTimestampMillis || 0,
							endTime: traceData?.payload?.endTimestampMillis || 0,
							hasMissingSpans: traceData?.payload?.hasMissingSpans || false,
						}}
						interestedSpanId={interestedSpanId || ''}
						uncollapsedNodes={uncollapsedNodes}
						setInterestedSpanId={setInterestedSpanId}
						setTraceFlamegraphStatsWidth={setTraceFlamegraphStatsWidth}
						selectedSpan={selectedSpan}
						setSelectedSpan={setSelectedSpan}
					/>
				);
			default:
				return <Spinner tip="Fetching the trace!" />;
		}
	}, [
		errorFetchingTraceData,
		interestedSpanId,
		selectedSpan,
		setInterestedSpanId,
		setSelectedSpan,
		setTraceFlamegraphStatsWidth,
		spans,
		traceData?.payload?.endTimestampMillis,
		traceData?.payload?.hasMissingSpans,
		traceData?.payload?.startTimestampMillis,
		traceId,
		traceWaterfallState,
		uncollapsedNodes,
	]);

	return <div className="trace-waterfall">{getContent}</div>;
}

export default TraceWaterfall;
