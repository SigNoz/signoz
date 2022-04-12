import { Typography } from 'antd';
import getByErrorType from 'api/errors/getByErrorTypeAndService';
import getById from 'api/errors/getById';
import Spinner from 'components/Spinner';
import ErrorDetailsContainer from 'container/ErrorDetails';
import React from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { PayloadProps } from 'types/api/errors/getById';
import { GlobalReducer } from 'types/reducer/globalTime';

function ErrorDetails(): JSX.Element {
	const { errorType, serviceName } = useParams<ErrorDetailsParams>();
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { search } = useLocation();
	const params = new URLSearchParams(search);

	const errorId = params.get('errorId');

	const { data, status } = useQuery(
		[
			'errorByType',
			errorType,
			'serviceName',
			serviceName,
			maxTime,
			minTime,
			errorId,
		],
		{
			queryFn: () =>
				getByErrorType({
					end: maxTime,
					errorType,
					serviceName,
					start: minTime,
				}),
			enabled: errorId === null,
			cacheTime: 5000,
		},
	);

	const { status: ErrorIdStatus, data: errorIdPayload } = useQuery(
		[
			'errorByType',
			errorType,
			'serviceName',
			serviceName,
			maxTime,
			minTime,
			'errorId',
			errorId,
		],
		{
			queryFn: () =>
				getById({
					end: maxTime,
					errorId: errorId || data?.payload?.errorId || '',
					start: minTime,
				}),
			enabled: errorId !== null || status === 'success',
			cacheTime: 5000,
		},
	);

	if (status === 'loading' || ErrorIdStatus === 'loading') {
		return <Spinner tip="Loading.." />;
	}

	if (status === 'error' || ErrorIdStatus === 'error') {
		return <Typography>{data?.error || errorIdPayload?.error}</Typography>;
	}

	return (
		<ErrorDetailsContainer idPayload={errorIdPayload?.payload as PayloadProps} />
	);
}

export interface ErrorDetailsParams {
	errorType: string;
	serviceName: string;
}

export default ErrorDetails;
