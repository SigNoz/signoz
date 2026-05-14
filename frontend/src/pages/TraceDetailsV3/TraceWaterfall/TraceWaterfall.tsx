import { Dispatch, SetStateAction, useMemo } from 'react';
import { Skeleton } from 'antd';
import { AxiosError } from 'axios';
import Spinner from 'components/Spinner';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { GetTraceV3SuccessResponse, SpanV3 } from 'types/api/trace/getTraceV3';

import { TraceWaterfallStates } from './constants';
import Error from './TraceWaterfallStates/Error/Error';
import NoData from './TraceWaterfallStates/NoData/NoData';
import Success from './TraceWaterfallStates/Success/Success';
import { getVisibleSpans } from './utils';

import { IInterestedSpan } from './types';

import './TraceWaterfall.styles.scss';

interface ITraceWaterfallProps {
	traceId: string;
	uncollapsedNodes: string[];
	isFullDataLoaded: boolean;
	localUncollapsedNodes: Set<string>;
	setLocalUncollapsedNodes: Dispatch<SetStateAction<Set<string>>>;
	traceData:
		| SuccessResponse<GetTraceV3SuccessResponse, unknown>
		| ErrorResponse
		| undefined;
	isFetchingTraceData: boolean;
	errorFetchingTraceData: unknown;
	interestedSpanId: IInterestedSpan;
	setInterestedSpanId: Dispatch<SetStateAction<IInterestedSpan>>;
	selectedSpan: SpanV3 | undefined;
	setSelectedSpan: Dispatch<SetStateAction<SpanV3 | undefined>>;
	filteredSpanIds: string[];
	isFilterActive: boolean;
}

function TraceWaterfall(props: ITraceWaterfallProps): JSX.Element {
	const {
		traceData,
		isFetchingTraceData,
		errorFetchingTraceData,
		interestedSpanId,
		traceId,
		uncollapsedNodes,
		isFullDataLoaded,
		localUncollapsedNodes,
		setLocalUncollapsedNodes,
		setInterestedSpanId,
		setSelectedSpan,
		selectedSpan,
		filteredSpanIds,
		isFilterActive,
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
	const allSpans = useMemo(
		() => traceData?.payload?.spans || [],
		[traceData?.payload?.spans],
	);

	// In frontend mode, compute visible spans from local collapse state.
	// In backend mode, the API already returns only visible spans.
	const spans = useMemo(() => {
		if (!isFullDataLoaded) {
			return allSpans;
		}
		return getVisibleSpans(allSpans, localUncollapsedNodes);
	}, [allSpans, isFullDataLoaded, localUncollapsedNodes]);

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
						isFullDataLoaded={isFullDataLoaded}
						localUncollapsedNodes={localUncollapsedNodes}
						setLocalUncollapsedNodes={setLocalUncollapsedNodes}
						setInterestedSpanId={setInterestedSpanId}
						selectedSpan={selectedSpan}
						setSelectedSpan={setSelectedSpan}
						filteredSpanIds={filteredSpanIds}
						isFilterActive={isFilterActive}
						isFetching={
							traceWaterfallState ===
							TraceWaterfallStates.FETCHING_WITH_OLD_DATA_PRESENT
						}
					/>
				);
			default:
				return <Spinner tip="Fetching the trace!" />;
		}
	}, [
		errorFetchingTraceData,
		filteredSpanIds,
		interestedSpanId,
		isFilterActive,
		isFullDataLoaded,
		localUncollapsedNodes,
		setLocalUncollapsedNodes,
		selectedSpan,
		setInterestedSpanId,
		setSelectedSpan,
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
