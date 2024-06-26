import getTriggeredApi from 'api/alerts/getTriggered';
import logEvent from 'api/common/logEvent';
import Spinner from 'components/Spinner';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import useAxiosError from 'hooks/useAxiosError';
import { isEqual } from 'lodash-es';
import { useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';

import TriggerComponent from './TriggeredAlert';

function TriggeredAlerts(): JSX.Element {
	const userId = useSelector<AppState, string | undefined>(
		(state) => state.app.user?.userId,
	);

	const responseRef = useRef({});

	const handleError = useAxiosError();

	const alertsResponse = useQuery(
		[REACT_QUERY_KEY.GET_TRIGGERED_ALERTS, userId],
		{
			queryFn: () =>
				getTriggeredApi({
					active: true,
					inhibited: true,
					silenced: false,
				}),
			refetchInterval: 30000,
			onError: handleError,
		},
	);

	useEffect(() => {
		if (!isEqual(responseRef.current, alertsResponse)) {
			if (!alertsResponse.isLoading) {
				logEvent('Alert: Triggered alert list page visited', {
					number: alertsResponse?.data?.payload?.length,
				});
			}
			responseRef.current = alertsResponse || {};
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [alertsResponse.isLoading, alertsResponse.data]);

	if (alertsResponse.error) {
		return <TriggerComponent allAlerts={[]} />;
	}

	if (alertsResponse.isFetching || alertsResponse?.data?.payload === undefined) {
		return <Spinner height="75vh" tip="Loading Alerts..." />;
	}

	return <TriggerComponent allAlerts={alertsResponse?.data?.payload || []} />;
}

export default TriggeredAlerts;
