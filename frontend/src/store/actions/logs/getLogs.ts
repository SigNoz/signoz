import GetLogs from 'api/logs/GetLogs';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { SET_LOADING, SET_LOGS } from 'types/actions/logs';

export const getLogs = (props): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch): void => {
		dispatch({
			type: SET_LOADING,
			payload: true,
		});

		const response = await GetLogs(props);

		if (response.payload)
			dispatch({
				type: SET_LOGS,
				payload: response.payload,
			});
		else
			dispatch({
				type: SET_LOGS,
				payload: [],
			});

		dispatch({
			type: SET_LOADING,
			payload: false,
		});
	};
};
