import React from 'react';
import useFetch from 'hooks/useFetch';
import getTraceItem from 'api/trace/getTraceItem';
import { useParams } from 'react-router-dom';
import { Props as TraceDetailProps } from 'types/api/trace/getTraceItem';
import Spinner from 'components/Spinner';
import { Typography } from 'antd';
import TraceDetailContainer from 'container/TraceDetail';

const TraceDetail = (): JSX.Element => {
	const { id } = useParams<TraceDetailProps>();

	const traceDetailResponse = useFetch(getTraceItem, {
		id,
	});

	if (traceDetailResponse.error) {
		return (
			<Typography>
				{traceDetailResponse.errorMessage || 'Something went wrong'}
			</Typography>
		);
	}

	if (traceDetailResponse.loading || traceDetailResponse.payload === undefined) {
		return <Spinner tip="Loading.." />;
	}

	return <TraceDetailContainer response={traceDetailResponse.payload} />;
};

export default TraceDetail;
