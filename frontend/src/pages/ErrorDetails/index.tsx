import { Typography } from 'antd';
import getByErrorType from 'api/errors/getByErrorTypeAndService';
import getById from 'api/errors/getById';
import Spinner from 'components/Spinner';
import ROUTES from 'constants/routes';
import ErrorDetailsContainer from 'container/ErrorDetails';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { Redirect, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { urlKey } from './utils';

// eslint-disable-next-line sonarjs/cognitive-complexity
function ErrorDetails(): JSX.Element {
	const { t } = useTranslation(['common']);
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { search } = useLocation();
	const params = useMemo(() => new URLSearchParams(search), [search]);

	const groupId = params.get(urlKey.groupId);
	const errorId = params.get(urlKey.errorId);
	const timestamp = params.get(urlKey.timestamp);

	const defaultError = t('something_went_wrong');

	const { data: IdData, status: IdStatus } = useQuery(
		[errorId, timestamp, groupId],
		{
			queryFn: () =>
				getById({
					errorID: errorId || '',
					groupID: groupId || '',
					timestamp: timestamp || '',
				}),
			enabled:
				errorId !== null &&
				groupId !== null &&
				timestamp !== null &&
				errorId.length !== 0 &&
				groupId.length !== 0 &&
				timestamp.length !== 0,
		},
	);

	const { data, status } = useQuery([maxTime, minTime, groupId, errorId], {
		queryFn: () =>
			getByErrorType({
				groupID: groupId || '',
				timestamp: timestamp || '',
			}),
		enabled: !!groupId && IdStatus !== 'success',
	});

	// if errorType and serviceName is null redirecting to the ALL_ERROR page not now
	if (groupId === null || timestamp === null) {
		return <Redirect to={ROUTES.ALL_ERROR} />;
	}

	// when the api is in loading state
	if (status === 'loading' || IdStatus === 'loading') {
		return <Spinner tip="Loading.." />;
	}

	// if any error occurred while loading
	if (status === 'error' || IdStatus === 'error') {
		return <Typography>{data?.error || defaultError}</Typography>;
	}

	const idPayload = data?.payload || IdData?.payload;

	// if API is successfully but there is an error
	if (
		(status === 'success' && data?.statusCode >= 400) ||
		(IdStatus === 'success' && IdData.statusCode >= 400) ||
		idPayload === null ||
		idPayload === undefined
	) {
		return <Typography>{data?.error || defaultError}</Typography>;
	}

	return <ErrorDetailsContainer idPayload={idPayload} />;
}

export interface ErrorDetailsParams {
	errorType: string;
	serviceName: string;
}

export default ErrorDetails;
