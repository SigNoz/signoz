import { Typography } from 'antd';
import getTraceItem from 'api/trace/getTraceItem';
import Spinner from 'components/Spinner';
import TraceDetailContainer from 'container/TraceDetail';
import React from 'react';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { Props as TraceDetailProps } from 'types/api/trace/getTraceItem';

function TraceDetail(): JSX.Element {
	const { id } = useParams<TraceDetailProps>();
	const { data: traceDetailResponse, error, isLoading, isError } = useQuery(
		`getTraceItem/${id}`,
		() => getTraceItem({ id }),
		{
			cacheTime: 3000,
		},
	);

	if (traceDetailResponse?.error || error || isError) {
		return (
			<Typography>
				{traceDetailResponse?.error || 'Something went wrong'}
			</Typography>
		);
	}

	if (isLoading || !(traceDetailResponse && traceDetailResponse.payload)) {
		return <Spinner tip="Loading.." />;
	}

	return <TraceDetailContainer response={traceDetailResponse.payload} />;
}

export default TraceDetail;
