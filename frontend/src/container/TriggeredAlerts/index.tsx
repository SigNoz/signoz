import getTriggeredApi from 'api/alerts/getTriggered';
import Spinner from 'components/Spinner';
import { State } from 'hooks/useFetch';
import { useNotifications } from 'hooks/useNotifications';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PayloadProps } from 'types/api/alerts/getTriggered';

import TriggerComponent from './TriggeredAlert';

function TriggeredAlerts(): JSX.Element {
	const [groupState, setGroupState] = useState<State<PayloadProps>>({
		error: false,
		errorMessage: '',
		loading: true,
		success: false,
		payload: [],
	});
	const { t } = useTranslation(['common']);
	const { notifications } = useNotifications();

	const fetchData = useCallback(async () => {
		try {
			setGroupState((state) => ({
				...state,
				loading: true,
			}));

			const response = await getTriggeredApi({
				active: true,
				inhibited: true,
				silenced: false,
			});

			if (response.statusCode === 200) {
				setGroupState((state) => ({
					...state,
					loading: false,
					payload: response.payload || [],
				}));
			} else {
				setGroupState((state) => ({
					...state,
					loading: false,
					error: true,
					errorMessage: response.error || 'Something went wrong',
				}));
			}
		} catch (error) {
			setGroupState((state) => ({
				...state,
				error: true,
				loading: false,
				errorMessage: 'Something went wrong',
			}));
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		if (groupState.error) {
			notifications.error({
				message: groupState.errorMessage || t('something_went_wrong'),
			});
		}
	}, [groupState.error, groupState.errorMessage, t, notifications]);

	if (groupState.error) {
		return <TriggerComponent allAlerts={[]} />;
	}

	if (groupState.loading || groupState.payload === undefined) {
		return <Spinner height="75vh" tip="Loading Alerts..." />;
	}

	// commented the reduce() call as we no longer use /alerts/groups
	// API from alert manager, which returns a group for each receiver

	// const initialAlerts: Alerts[] = [];

	// const allAlerts: Alerts[] = groupState.payload.reduce((acc, curr) => {
	//	return [...acc, ...curr.alerts];
	// }, initialAlerts);

	return <TriggerComponent allAlerts={groupState.payload} />;
}

export default TriggeredAlerts;
