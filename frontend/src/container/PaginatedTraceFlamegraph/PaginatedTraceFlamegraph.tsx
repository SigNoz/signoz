import './PaginatedTraceFlamegraph.styles.scss';

import { AxiosError } from 'axios';
import Spinner from 'components/Spinner';
import useGetTraceFlamegraph from 'hooks/trace/useGetTraceFlamegraph';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TraceDetailFlamegraphURLProps } from 'types/api/trace/getTraceFlamegraph';

import { TraceFlamegraphStates } from './constants';
import Error from './TraceFlamegraphStates/Error/Error';
import NoData from './TraceFlamegraphStates/NoData/NoData';
import Success from './TraceFlamegraphStates/Success/Success';

function TraceFlamegraph(): JSX.Element {
	const { id: traceId } = useParams<TraceDetailFlamegraphURLProps>();
	const [level, setLevel] = useState<number>(0);
	const { data, isFetching, error } = useGetTraceFlamegraph({
		level,
		traceId,
	});
	console.log(data, isFetching, error);

	// get the current state of trace flamegraph based on the API lifecycle
	const traceFlamegraphState = useMemo(() => {
		if (isFetching) {
			if (
				data &&
				data.payload &&
				data.payload.spans &&
				data.payload.spans.length > 0
			) {
				return TraceFlamegraphStates.FETCHING_WITH_OLD_DATA_PRESENT;
			}
			return TraceFlamegraphStates.LOADING;
		}
		if (error) {
			return TraceFlamegraphStates.ERROR;
		}
		if (
			data &&
			data.payload &&
			data.payload.spans &&
			data.payload.spans.length === 0
		) {
			return TraceFlamegraphStates.NO_DATA;
		}

		return TraceFlamegraphStates.SUCCESS;
	}, [error, isFetching, data]);

	// capture the spans from the response, since we do not need to do any manipulation on the same we will keep this as a simple constant [ memoized ]
	const spans = useMemo(() => data?.payload?.spans || [], [
		data?.payload?.spans,
	]);

	// get the content based on the current state of the trace waterfall
	const getContent = useMemo(() => {
		switch (traceFlamegraphState) {
			case TraceFlamegraphStates.LOADING:
				return <Spinner tip="Fetching the trace!" />;
			case TraceFlamegraphStates.ERROR:
				return <Error error={error as AxiosError} />;
			case TraceFlamegraphStates.NO_DATA:
				return <NoData id={traceId} />;
			case TraceFlamegraphStates.SUCCESS:
			case TraceFlamegraphStates.FETCHING_WITH_OLD_DATA_PRESENT:
				return (
					<Success
						spans={spans}
						setLevel={setLevel}
						traceMetadata={{
							startTime: data?.payload?.startTimestampMillis || 0,
							endTime: data?.payload?.endTimestampMillis || 0,
						}}
					/>
				);
			default:
				return <Spinner tip="Fetching the trace!" />;
		}
	}, [
		data?.payload?.endTimestampMillis,
		data?.payload?.startTimestampMillis,
		error,
		spans,
		traceFlamegraphState,
		traceId,
	]);

	return <div className="trace-flamegraph">{getContent}</div>;
}

export default TraceFlamegraph;
