import React, { useCallback, useEffect, useState } from 'react';
import { SelectValue } from 'antd/lib/select';
import getGroupApi from 'api/alerts/getGroup';
import { PayloadProps, Props } from 'types/api/alerts/getGroups';
import { State } from 'hooks/useFetch';
import Spinner from 'components/Spinner';

const TriggeredAlerts = () => {
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

			const response = await getGroupApi({
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

	return <div>asd</div>;
};

export default TriggeredAlerts;
