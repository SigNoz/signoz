import getByErrorType from 'api/errors/getByErrorTypeAndService';
import getById from 'api/errors/getById';
import Spinner from 'components/Spinner';
import ErrorDetailsContainer from 'container/ErrorDetails';
import React from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

function ErrorDetails(): JSX.Element {
	const { errorType, serviceName } = useParams<ErrorDetailsParams>();
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { data, status } = useQuery(
		['errorByType', errorType, 'serviceName', serviceName, maxTime, minTime],
		{
			queryFn: () =>
				getByErrorType({
					end: maxTime,
					errorType,
					serviceName,
					start: minTime,
				}),
		},
	);

	const { status: ErrorIdStatus } = useQuery(
		[
			'errorByType',
			errorType,
			'serviceName',
			serviceName,
			maxTime,
			minTime,
			'errorId',
		],
		{
			queryFn: () =>
				getById({
					end: maxTime,
					errorId: data?.payload?.errorId || '',
					start: minTime,
				}),
			enabled: status === 'success',
		},
	);

	if (status === 'loading' || ErrorIdStatus === 'loading') {
		return <Spinner tip="Loading.." />;
	}

	return (
		<div>
			<ErrorDetailsContainer />
		</div>
	);
}

export interface ErrorDetailsParams {
	errorType: string;
	serviceName: string;
}

export default ErrorDetails;
