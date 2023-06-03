import getTriggeredApi from 'api/alerts/getTriggered';
import Spinner from 'components/Spinner';
import { useNotifications } from 'hooks/useNotifications';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import TriggerComponent from './TriggeredAlert';

function TriggeredAlerts(): JSX.Element {
	const { t } = useTranslation(['common']);
	const { notifications } = useNotifications();
	const { user } = useSelector<AppState, AppReducer>((state) => state.app);

	const alertsResponse = useQuery(['triggeredAlerts', user?.userId], {
		queryFn: () =>
			getTriggeredApi({
				active: true,
				inhibited: true,
				silenced: false,
			}),
		refetchInterval: 30000,
	});

	useEffect(() => {
		if (alertsResponse?.data?.error) {
			notifications.error({
				message: alertsResponse.data?.error || t('something_went_wrong'),
			});
		}
	}, [t, notifications, alertsResponse.data?.error]);

	if (alertsResponse.error) {
		return <TriggerComponent allAlerts={[]} />;
	}

	if (alertsResponse.isFetching || alertsResponse?.data?.payload === undefined) {
		return <Spinner height="75vh" tip="Loading Alerts..." />;
	}

	return <TriggerComponent allAlerts={alertsResponse?.data?.payload || []} />;
}

export default TriggeredAlerts;
