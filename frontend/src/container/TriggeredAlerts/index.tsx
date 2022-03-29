import getTriggeredApi from 'api/alerts/getTriggered';
import Spinner from 'components/Spinner';
import { State } from 'hooks/useFetch';
import React, { useCallback, useEffect, useState } from 'react';
import { Alerts } from 'types/api/alerts/getAll';
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

	if (groupState.error) {
		return <div>{groupState.errorMessage}</div>;
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
