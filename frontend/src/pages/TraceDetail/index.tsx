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
	const {
		data: traceDetailResponse,
		error,
		isLoading,
		isLoadingError,
	} = useQuery(`getTraceItem/${id}`, () => getTraceItem({ id }));

	if (traceDetailResponse?.error || error || isLoadingError) {
		return (
			<Typography>
				{traceDetailResponse?.error || 'Something went wrong'}
			</Typography>
		);
	}

	if (isLoading || !traceDetailResponse?.payload) {
		return <Spinner tip="Loading.." />;
	}

	return <TraceDetailContainer response={traceDetailResponse?.payload} />;
}

export default TraceDetail;
