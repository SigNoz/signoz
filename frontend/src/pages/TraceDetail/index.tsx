import { Typography } from 'antd';
import getTraceItem from 'api/trace/getTraceItem';
import Spinner from 'components/Spinner';
import TraceDetailContainer from 'container/TraceDetail';
import useFetch from 'hooks/useFetch';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	PayloadProps,
	Props as TraceDetailProps,
} from 'types/api/trace/getTraceItem';

function TraceDetail(): JSX.Element {
	const { id } = useParams<TraceDetailProps>();
	const [traceDetailResponse, setTraceDetailResponse] = useState<
		SuccessResponse<PayloadProps> | ErrorResponse
	>();
	useEffect(() => {
		getTraceItem({ id }).then((resp) => setTraceDetailResponse(resp));
	}, [id]);
	// const traceDetailResponse = useFetch(getTraceItem, {
	// 	id,
	// });

	if (
		!traceDetailResponse ||
		traceDetailResponse.loading ||
		traceDetailResponse.payload === undefined
	) {
		return <Spinner tip="Loading.." />;
	}

	if (traceDetailResponse.error) {
		return (
			<Typography>
				{traceDetailResponse.errorMessage || 'Something went wrong'}
			</Typography>
		);
	}

	return <TraceDetailContainer response={traceDetailResponse.payload} />;
}

export default TraceDetail;
